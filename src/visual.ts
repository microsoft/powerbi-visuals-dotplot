/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbi.extensibility.visual {
    var DefaultRadius: number = 5;
    var DefaultStrokeWidth: number = 1;

    export class DotPlot implements IVisual {
        private static DataLabelXOffset: number = 2;
        private static DataLabelYOffset: number = 1.5;

        private static DataLabelAngle: number = -90;
        private static DataLabelXOffsetIndex: number = 0.3;

        private static getCategoryTextProperties(text?: string): TextProperties {
            return {
                text: text,
                fontFamily: "'Segoe UI',wf_segoe-ui_normal,helvetica,arial,sans-serif",
                fontSize: PixelConverter.toString(11),
            };
        }

        private static getValueTextProperties(fontSize: number, text?: string): TextProperties {
            return {
                text: text,
                fontFamily: "'Segoe UI',wf_segoe-ui_normal,helvetica,arial,sans-serif",
                fontSize: PixelConverter.toString(fontSize),
            };
        }

        private get settings() {
            return this.data && this.data.settings;
        }

        private layout: VisualLayout;
        private divContainer: D3.Selection;
        private svg: D3.Selection;
        private xAxisSelection: D3.Selection;
        private dotPlot: D3.Selection;
        private clearCatcher: D3.Selection;
        private behavior: IInteractiveBehavior;

        private colors: IDataColorPalette;
        private animator: IGenericAnimator;
        private durationAnimations: number = 200;
        private data: DotPlotData;
        private dataViewport: IViewport;
        private xAxisProperties: IAxisProperties;

        private radius: number;
        private strokeWidth: number;
        private interactivityService: IInteractivityService;
        private scaleType: string = AxisScale.linear;

        private dotPlotSelectors: DotPlotSelectors =
        {
            scrollableContainer: CreateClassAndSelector("dotPlotScrollableContainer"),
            svgPlotSelector: CreateClassAndSelector("dotplot"),
            plotSelector: CreateClassAndSelector("dotplotSelector"),
            plotGroupSelector: CreateClassAndSelector("dotplotGroup"),
            axisSelector: CreateClassAndSelector("axisGraphicsContext"),
            xAxisSelector: CreateClassAndSelector("x axis"),
            circleSeletor: CreateClassAndSelector("circleSelector"),
        };

        private static DefaultValues = {
            labelOrientation: DotPlotLabelsOrientation.Horizontal
        };

        private static getTooltipData(value: any): TooltipDataItem[] {
            return [{
                displayName: "Value",
                value: value.toString()
            }];
        }

        public static converter(dataView: DataView, height: number, colors: IDataColorPalette, radius: number): DotPlotData {
            if (!dataView || !dataView.categorical || _.isEmpty(dataView.categorical.values) || _.isEmpty(dataView.categorical.categories)) {
                return null;
            }

            var properties = DotPlotSettings.getProperties(this.capabilities);
            var settings = this.parseSettings(dataView);
            var categoryColumn = dataView.categorical.categories[0];
            var valueColumn = dataView.categorical.values[0];

            var valueValues = valueColumn.values.map(x => x || 0);

            var minValue = <number>_.min(valueValues);
            var maxValue = <number>_.max(valueValues);

            var valuesFormatter: IValueFormatter = valueFormatter.create({
                format: valueFormatter.getFormatString(valueColumn.source, properties.general.formatString),
                precision: settings.labels.labelPrecision,
                value: settings.labels.labelDisplayUnits || maxValue
            });

            var formattedValues = valueValues.map(valuesFormatter.format);

            var categoriesFormatter: IValueFormatter = valueFormatter.create({
                format: valueFormatter.getFormatString(categoryColumn.source, properties.general.formatString)
            });

            var categories: DotPlotChartCategory[] = categoryColumn.values.map((x, i) => <DotPlotChartCategory>{
                value: categoriesFormatter.format(x),
                selectionId: SelectionId.createWithId(categoryColumn.identity[i])
            });

            var labelFontSize: number = PixelConverter.fromPointToPixel(settings.labels.fontSize);
            var categoryLabelHeight = 15;
            var maxXAxisHeight = (settings.categoryAxis.show ? 20 : 0) + (settings.categoryAxis.showAxisTitle ? categoryLabelHeight : 0);

            var maxCategoryLength = _.max(categories.map(x => x.value.length));
            var maxCategoryWidth = maxCategoryLength * TextMeasurementService.measureSvgTextWidth(DotPlot.getCategoryTextProperties("W"));

            var maxLabelLength = _.max(formattedValues.map(x => x.length));
            var maxLabelWidth = Math.max(50, maxLabelLength * TextMeasurementService.measureSvgTextWidth(DotPlot.getValueTextProperties(labelFontSize, "0")) * 0.8);

            var diameter: number = 2 * radius + 1;
            var dotsTotalHeight: number = height - maxXAxisHeight - radius * 2 - labelFontSize;
            var maxDots: number = Math.floor(dotsTotalHeight / diameter);

            var yScale: D3.Scale.LinearScale = d3.scale.linear()
                .domain([0, maxDots])
                .range([dotsTotalHeight, 0]);

            var dataPointsGroup: DotPlotDataGroup[] = [];

            var color = settings.dataPoint.fill;
            var minDots = minValue / (maxValue / maxDots);
            var dotScale = d3.scale.log()
                .domain([minValue < 0 ? 1 : minValue, maxValue])
                .range([minDots <= 0 ? 1 : minDots, maxDots])
                .clamp(true);

            for (var vi = 0, length = valueValues.length; vi < length; vi++) {
                var value = <number>valueValues[vi];

                var scaledValue = dotScale(value);
                var dataPoints: DotPlotDataPoint[] = [];

                for (var level = 0; level < scaledValue && maxDots > 0; level++) {
                    dataPoints.push({
                        y: yScale(level),
                        tooltipInfo: DotPlot.getTooltipData(value.toFixed(settings.labels.labelPrecision).toString())
                    });
                }

                var categorySelectionId = SelectionIdBuilder.builder().withCategory(categoryColumn, vi).createSelectionId(),
                    tooltipInfo = DotPlot.getTooltipData(value.toFixed(settings.labels.labelPrecision));

                dataPointsGroup.push({
                    category: categories[vi],
                    selected: false,
                    value: value,
                    label: formattedValues[vi],
                    color: color,
                    identity: categorySelectionId,
                    tooltipInfo: tooltipInfo,
                    dataPoints: dataPoints,
                    highlight: false,
                    index: dataPointsGroup.length,
                    labelFontSize: labelFontSize + "px"
                });
            }

            return {
                dataGroups: dataPointsGroup,
                categoryAxisName: categoryColumn.source.displayName,
                categoryColumn: categoryColumn,
                settings: settings,
                maxXAxisHeight: maxXAxisHeight,
                labelFontSize: labelFontSize,
                categoryLabelHeight: categoryLabelHeight,
                dotsTotalHeight: dotsTotalHeight,
                maxLabelWidth: maxLabelWidth,
                maxCategoryWidth: maxCategoryWidth
            };
        }

        private static parseSettings(dataView: DataView): DotPlotSettings {
            var settings = DotPlotSettings.parse(dataView, this.capabilities);
            settings.labels.labelPrecision = Math.min(Math.max(0, settings.labels.labelPrecision), 17);

            settings.createOriginalSettings();
            return settings;
        }

        public constructor(options?: DotPlotConstructorOptions) {
            if (options) {
                if (options.svg) {
                    this.svg = options.svg;
                }
                if (options.animator) {
                    this.animator = options.animator;
                }

                this.radius = options.radius || DefaultRadius;
                this.strokeWidth = options.strokeWidth || DefaultStrokeWidth;
            }
        }

        public init(options: VisualInitOptions): void {
            var element = options.element;
            this.behavior = new DotplotBehavior();

            this.interactivityService = createInteractivityService(options.host);
            this.radius = DefaultRadius;
            this.strokeWidth = DefaultStrokeWidth;
            this.colors = options.style.colorPalette.dataColors;
            this.layout = new VisualLayout(options.viewport, { top: 5, bottom: 15, right: 0, left: 0 });

            this.divContainer = d3.select(element.get(0))
                .append("div")
                .classed(this.dotPlotSelectors.scrollableContainer.class, true);

            this.svg = this.divContainer
                .append("svg")
                .classed(this.dotPlotSelectors.svgPlotSelector.class, true);

            this.clearCatcher = appendClearCatcher(this.svg);

            var axisGraphicsContext = this.svg
                .append("g")
                .classed(this.dotPlotSelectors.axisSelector.class, true);

            this.dotPlot = this.svg
                .append("g")
                .classed(this.dotPlotSelectors.plotSelector.class, true);

            this.xAxisSelection = axisGraphicsContext
                .append("g")
                .classed(this.dotPlotSelectors.xAxisSelector.class, true);
        }

        public update(options: VisualUpdateOptions): void {
            if (!options.dataViews || !options.dataViews[0]) return;

            this.layout.viewport = options.viewport;

            var data = DotPlot.converter(options.dataViews[0], this.layout.viewportIn.height, this.colors, this.radius);

            if (!data) {
                this.clear();
                return;
            }

            this.data = data;

            this.durationAnimations = getAnimationDuration(this.animator, options.suppressAnimations);

            this.dataViewport = {
                height: this.layout.viewportIn.height,
                width: Math.max(this.layout.viewportIn.width, this.data.dataGroups.length * (this.radius * 2 + 2) + this.data.maxLabelWidth)
            };

            this.svg.style({
                height: PixelConverter.toString(this.dataViewport.height),
                width: PixelConverter.toString(this.dataViewport.width)
            });

            this.divContainer.style({
                width: `${this.layout.viewport.width}px`,
                height: `${this.layout.viewport.height}px`
            });

            if (this.interactivityService) {
                this.interactivityService.applySelectionStateToData(this.data.dataGroups);
            }

            this.calculateAxes();

            this.renderAxis(this.durationAnimations);

            this.drawDotPlot();

            if (this.settings.labels.show) {
                var layout: ILabelLayout = this.getDotPlotLabelsLayout();

                var labels: D3.UpdateSelection = dataLabelUtils.drawDefaultLabelsForDataPointChart(
                    this.data.dataGroups,
                    this.svg,
                    layout,
                    this.dataViewport,
                    !options.suppressAnimations,
                    this.durationAnimations);

                if (labels) {
                    labels.attr("transform", (dataGroup: DotPlotDataGroup) => {
                        var size: ISize = dataGroup.size;

                        if (DotPlot.DefaultValues.labelOrientation === DotPlotLabelsOrientation.Vertical) {
                            var px: number = dataGroup.anchorPoint.x;
                            var py: number = dataGroup.anchorPoint.y;
                            var dx = size.width / DotPlot.DataLabelXOffset + size.height * DotPlot.DataLabelXOffsetIndex;
                            var dy = size.height + size.height / DotPlot.DataLabelYOffset;

                            return SVGUtil.translateAndRotate(dx, -dy, px, py, DotPlot.DataLabelAngle);
                        } else {
                            var dx = size.width / DotPlot.DataLabelXOffset;
                            var dy = size.height / DotPlot.DataLabelYOffset;

                            return SVGUtil.translate(dx, dy);
                        }
                    });
                }
            }
            else {
                dataLabelUtils.cleanDataLabels(this.svg);
            }
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            if (!this.settings || !this.settings.originalSettings) {
                return [];
            }

            var enumeration = DotPlotSettings.enumerateObjectInstances(this.settings.originalSettings, options, DotPlot.capabilities);

            return enumeration.complete();
        }

        private drawDotPlot(): void {
            var dotGroupSelection: D3.UpdateSelection = this.dotPlot.selectAll(this.dotPlotSelectors.plotGroupSelector.selector).data(this.data.dataGroups);
            var hasSelection = this.interactivityService && this.interactivityService.hasSelection();

            dotGroupSelection
                .enter()
                .append("g")
                .classed(this.dotPlotSelectors.plotGroupSelector.class, true);

            dotGroupSelection.attr({
                'transform': (d: DotPlotDataGroup) => SVGUtil.translate(this.getXDotPositionByIndex(d.index), this.layout.margin.top + this.data.labelFontSize),
                'stroke': "black",
                "stroke-width": this.strokeWidth
            })
                .style("fill-opacity", (item: DotPlotDataGroup) => dotPlotUtils.getFillOpacity(item.selected, item.highlight, hasSelection, false));

            var circleSelection = dotGroupSelection.selectAll(this.dotPlotSelectors.circleSeletor.selector)
                .data((d: DotPlotDataGroup) => { return d.dataPoints; });

            circleSelection
                .enter()
                .append("circle")
                .classed(this.dotPlotSelectors.circleSeletor.class, true);

            circleSelection.attr(
                {
                    cy: (point: DotPlotDataPoint) => { return point.y; },
                    r: this.radius,
                    fill: this.settings.dataPoint.fill
                });

            this.renderTooltip(dotGroupSelection);

            circleSelection
                .exit()
                .remove();

            dotGroupSelection
                .exit()
                .remove();

            var interactivityService = this.interactivityService;
            if (interactivityService) {
                interactivityService.applySelectionStateToData(this.data.dataGroups);

                var behaviorOptions: DotplotBehaviorOptions = {
                    columns: dotGroupSelection,
                    clearCatcher: this.clearCatcher,
                    interactivityService: this.interactivityService,
                };

                interactivityService.bind(this.data.dataGroups, this.behavior, behaviorOptions);
            }
        }

        private getXDotPositionByIndex(index: number): number {
            var scale: D3.Scale.OrdinalScale = <any>this.xAxisProperties.scale;
            return this.data.maxLabelWidth / 2 + scale(index);
        }

        private getDotPlotLabelsLayout(): ILabelLayout {
            return {
                labelText: (dataGroup: DotPlotDataGroup) => {
                    return dataLabelUtils.getLabelFormattedText({
                        label: dataGroup.label,
                        fontSize: parseFloat(<any>this.settings.labels.fontSize),
                        maxWidth: this.dataViewport.width,
                    });
                },
                labelLayout: {
                    x: (dataGroup: DotPlotDataGroup) => {
                        var x = this.getXDotPositionByIndex(dataGroup.index);
                        var dx = dataGroup.size.width / DotPlot.DataLabelXOffset;
                        return x - dx;
                    },
                    y: (dataGroup: DotPlotDataGroup) => {
                        var y = (_.isEmpty(dataGroup.dataPoints) ? this.data.dotsTotalHeight + this.radius * 2 : _.last(dataGroup.dataPoints).y) + this.data.labelFontSize;
                        var dy = dataGroup.size.height;
                        return y - dy;
                    }
                },
                filter: (dataGroup: DotPlotDataGroup) => {
                    return !!(dataGroup && dataGroup.dataPoints && this.layout.viewportIn.height - this.data.maxXAxisHeight + this.radius * 2 > this.data.labelFontSize);
                },
                style: {
                    "fill": this.settings.labels.color,
                    "font-size": this.data.labelFontSize + "px",
                    "font-family": LabelTextProperties.fontFamily
                },
            };
        }

        private clear(): void {
            this.dotPlot.selectAll("*").remove();
            this.xAxisSelection.selectAll("*").remove();
            dataLabelUtils.cleanDataLabels(this.svg);
            this.svg.style({ height: PixelConverter.toString(0), width: PixelConverter.toString(0) });
        }

        private renderTooltip(selection: D3.UpdateSelection): void {
            TooltipManager.addTooltip(selection, (tooltipEvent: TooltipEvent) =>
                (<DotPlotDataGroup>tooltipEvent.data).tooltipInfo);
        }

        private calculateAxes(): void {
            var pixelSpan = this.dataViewport.width - this.data.maxLabelWidth;
            var xAxisProperties = AxisHelper.createAxis({
                pixelSpan: pixelSpan,
                dataDomain: [0, this.data.dataGroups.length - 1],
                metaDataColumn: null,
                formatString: null,
                outerPadding: 0,
                isScalar: true,
                isVertical: false,
                forcedTickCount: Math.min(this.data.dataGroups.length,
                    Math.floor((pixelSpan + this.data.maxCategoryWidth) / Math.min(75, this.data.maxCategoryWidth))),
                useTickIntervalForDisplayUnits: true,
                isCategoryAxis: false,
                scaleType: this.scaleType,
                axisDisplayUnits: 0
            });

            var scale = xAxisProperties.axis.scale();
            scale.domain([-1, this.data.dataGroups.length]);
            var tickValues = xAxisProperties.axis.tickValues().filter(x => x < this.data.dataGroups.length);
            xAxisProperties.axis.tickValues(tickValues);
            var tickWidth = (tickValues.length > 1 ? scale(tickValues[1]) - scale(tickValues[0]) : pixelSpan) - 3;
            xAxisProperties.axis.tickFormat((index: number) => {
                if (!this.settings.categoryAxis.show || !this.data.dataGroups[index]) {
                    return "";
                }
                var textProperties = DotPlot.getCategoryTextProperties(this.data.dataGroups[index].category.value);
                return TextMeasurementService.getTailoredTextOrDefault(textProperties, tickWidth);
            });

            if (this.settings.categoryAxis.show) {
                // Should handle the label, units of the label and the axis style
                xAxisProperties.axisLabel = this.data.categoryAxisName;
            }

            this.xAxisProperties = xAxisProperties;
        }

        private renderAxis(duration: number): void {

            var height = this.dataViewport.height - this.data.maxXAxisHeight;
            this.xAxisSelection.attr({ transform: SVGUtil.translate(this.data.maxLabelWidth / 2, height) });

            var xAxis = this.xAxisProperties.axis.orient("bottom");

            this.xAxisSelection
                .transition()
                .duration(duration)
                .call(xAxis)
                .selectAll("g.tick text")
                .style("fill", this.settings.categoryAxis.labelColor);

            this.xAxisSelection.selectAll(".tick text")
                .append("title")
                .text((index: number) => this.data.dataGroups[index] && this.data.dataGroups[index].category.value);

            this.xAxisSelection
                .selectAll("line")
                .style("opacity", this.settings.categoryAxis.show ? 1 : 0);

            this.xAxisSelection
                .selectAll(".xAxisLabel")
                .remove();

            if (this.settings.categoryAxis.showAxisTitle) {
                var titleWidth = TextMeasurementService.measureSvgTextWidth(DotPlot.getCategoryTextProperties(this.data.categoryAxisName));
                this.xAxisSelection.append("text")
                    .text(this.data.categoryAxisName)
                    .style("text-anchor", "middle")
                    .attr("class", "xAxisLabel")
                    .style("fill", this.settings.categoryAxis.labelColor)
                    .attr("transform", SVGUtil.translate(this.dataViewport.width / 2 - titleWidth / 2, this.data.maxXAxisHeight - this.data.categoryLabelHeight + 11));
            }
        }
    }
}
