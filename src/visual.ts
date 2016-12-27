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
    // d3
    import Axis = d3.svg.Axis;
    import Selection = d3.Selection;
    import LinearScale = d3.scale.Linear;
    import OrdinalScale = d3.scale.Ordinal;
    import UpdateSelection = d3.selection.Update;

    // powerbi.extensibility.utils.formatting
    import valueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;
    import TextProperties = powerbi.extensibility.utils.formatting.TextProperties;
    import IValueFormatter = powerbi.extensibility.utils.formatting.IValueFormatter;
    import textMeasurementService = powerbi.extensibility.utils.formatting.textMeasurementService;

    // powerbi.extensibility.utils.type
    import PixelConverter = powerbi.extensibility.utils.type.PixelConverter;

    // powerbi.extensibility.utils.interactivity
    import appendClearCatcher = powerbi.extensibility.utils.interactivity.appendClearCatcher;
    import IInteractiveBehavior = powerbi.extensibility.utils.interactivity.IInteractiveBehavior;
    import IInteractivityService = powerbi.extensibility.utils.interactivity.IInteractivityService;
    import createInteractivityService = powerbi.extensibility.utils.interactivity.createInteractivityService;

    // powerbi.extensibility.utils.chart
    import AxisScale = powerbi.extensibility.utils.chart.axis.scale;
    import createAxis = powerbi.extensibility.utils.chart.axis.createAxis;
    import dataLabelUtils = powerbi.extensibility.utils.chart.dataLabel.utils;
    import ILabelLayout = powerbi.extensibility.utils.chart.dataLabel.ILabelLayout;
    import IAxisProperties = powerbi.extensibility.utils.chart.axis.IAxisProperties;
    import LabelTextProperties = powerbi.extensibility.utils.chart.dataLabel.utils.LabelTextProperties;

    // powerbi.extensibility.utils.svg
    import ISize = powerbi.extensibility.utils.svg.shapes.ISize;
    import translate = powerbi.extensibility.utils.svg.translate;
    import translateAndRotate = powerbi.extensibility.utils.svg.translateAndRotate;
    import createClassAndSelector = powerbi.extensibility.utils.svg.CssConstants.createClassAndSelector;

    // powerbi.extensibility.utils.tooltip
    import TooltipEventArgs = powerbi.extensibility.utils.tooltip.TooltipEventArgs;
    import ITooltipServiceWrapper = powerbi.extensibility.utils.tooltip.ITooltipServiceWrapper;
    import createTooltipServiceWrapper = powerbi.extensibility.utils.tooltip.createTooltipServiceWrapper;

    export class DotPlot implements IVisual {
        private static DataLabelXOffset: number = 2;
        private static DataLabelYOffset: number = 1.5;

        private static DataLabelAngle: number = -90;
        private static DataLabelXOffsetIndex: number = 0.3;

        private static DefaultRadius: number = 5;
        private static DefaultStrokeWidth: number = 1;

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
        private divContainer: Selection<any>;
        private svg: Selection<any>;
        private xAxisSelection: Selection<any>;
        private dotPlot: Selection<any>;
        private clearCatcher: Selection<any>;
        private behavior: IInteractiveBehavior;

        private colorPalette: IColorPalette;
        private durationAnimations: number = 0;

        private data: DotPlotData;
        private dataViewport: IViewport;
        private xAxisProperties: IAxisProperties;

        private interactivityService: IInteractivityService;
        private scaleType: string = AxisScale.linear;

        private radius: number = 5;
        private strokeWidth: number = 1;

        private tooltipServiceWrapper: ITooltipServiceWrapper;

        private dotPlotSelectors: DotPlotSelectors =
        {
            scrollableContainer: createClassAndSelector("dotPlotScrollableContainer"),
            svgPlotSelector: createClassAndSelector("dotplot"),
            plotSelector: createClassAndSelector("dotplotSelector"),
            plotGroupSelector: createClassAndSelector("dotplotGroup"),
            axisSelector: createClassAndSelector("axisGraphicsContext"),
            xAxisSelector: createClassAndSelector("x axis"),
            circleSeletor: createClassAndSelector("circleSelector"),
        };

        private static DefaultValues = {
            labelOrientation: DotPlotLabelsOrientation.Horizontal
        };

        private static getTooltipData(value: any): VisualTooltipDataItem[] {
            return [{
                displayName: "Value",
                value: value.toString()
            }];
        }

        public static converter(
            dataView: DataView,
            height: number,
            colors: IColorPalette,
            radius: number): DotPlotData {

            if (!dataView
                || !dataView.categorical
                || _.isEmpty(dataView.categorical.values)
                || _.isEmpty(dataView.categorical.categories)) {

                return null;
            }

            var settings = this.parseSettings(dataView);
            var categoryColumn = dataView.categorical.categories[0];
            var valueColumn = dataView.categorical.values[0];

            var valueValues = valueColumn.values.map(x => x || 0);

            var minValue = <number>_.min(valueValues);
            var maxValue = <number>_.max(valueValues);

            var valuesFormatter: IValueFormatter = valueFormatter.create({
                format: valueFormatter.getFormatStringByColumn(valueColumn.source),
                precision: settings.labels.labelPrecision,
                value: settings.labels.labelDisplayUnits || maxValue
            });

            var formattedValues = valueValues.map(valuesFormatter.format);

            var categoriesFormatter: IValueFormatter = valueFormatter.create({
                format: valueFormatter.getFormatStringByColumn(categoryColumn.source)
            });

            var categories: DotPlotChartCategory[] = categoryColumn.values.map((x, i) => <DotPlotChartCategory>{
                value: categoriesFormatter.format(x),
                selectionId: /*SelectionId.createWithId(categoryColumn.identity[i])*/null // TODO: 
            });

            var labelFontSize: number = PixelConverter.fromPointToPixel(settings.labels.fontSize);
            var categoryLabelHeight = 15;
            var maxXAxisHeight = (settings.categoryAxis.show ? 20 : 0) + (settings.categoryAxis.showAxisTitle ? categoryLabelHeight : 0);

            var maxCategoryLength = _.max(categories.map(x => x.value.length));
            var maxCategoryWidth = maxCategoryLength * textMeasurementService.measureSvgTextWidth(DotPlot.getCategoryTextProperties("W"));

            var maxLabelLength = _.max(formattedValues.map(x => x.length));
            var maxLabelWidth = Math.max(50, maxLabelLength * textMeasurementService.measureSvgTextWidth(DotPlot.getValueTextProperties(labelFontSize, "0")) * 0.8);

            var diameter: number = 2 * radius + 1;
            var dotsTotalHeight: number = height - maxXAxisHeight - radius * 2 - labelFontSize;
            var maxDots: number = Math.floor(dotsTotalHeight / diameter);

            var yScale: LinearScale<number, number> = d3.scale.linear()
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

                var categorySelectionId = /*SelectionIdBuilder.builder().withCategory(categoryColumn, vi).createSelectionId()*/null /* TODO: implement it */,
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
            var settings: DotPlotSettings = DotPlotSettings.parse<DotPlotSettings>(dataView);

            settings.labels.labelPrecision = Math.min(Math.max(0, settings.labels.labelPrecision), 17);

            // settings.createOriginalSettings();
            return settings;
        }

        public constructor(options: VisualConstructorOptions) {
            // if (options) {
            //     if (options.svg) {
            //         this.svg = options.svg;
            //     }
            //     if (options.animator) {
            //         this.animator = options.animator;
            //     }

            //     this.radius = options.radius || DefaultRadius;
            //     this.strokeWidth = options.strokeWidth || DefaultStrokeWidth;
            // }

            this.init(options);
        }

        public init(options: VisualConstructorOptions): void {
            this.behavior = new DotplotBehavior();

            this.tooltipServiceWrapper = createTooltipServiceWrapper(
                options.host.tooltipService,
                options.element);

            this.interactivityService = createInteractivityService(options.host);
            // this.radius = DefaultRadius;
            // this.strokeWidth = DefaultStrokeWidth;
            this.colorPalette = options.host.colorPalette;

            this.layout = new VisualLayout(/*options.viewport*/null, { top: 5, bottom: 15, right: 0, left: 0 });

            this.divContainer = d3.select(options.element)
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

            var data = DotPlot.converter(options.dataViews[0], this.layout.viewportIn.height, this.colorPalette, this.radius);

            if (!data) {
                this.clear();
                return;
            }

            this.data = data;

            // this.durationAnimations = getAnimationDuration(this.animator, options.suppressAnimations);

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

                var labels: UpdateSelection<DotPlotDataGroup> = dataLabelUtils.drawDefaultLabelsForDataPointChart(
                    this.data.dataGroups,
                    this.svg,
                    layout,
                    this.dataViewport,
                    false,
                    this.durationAnimations);

                if (labels) {
                    labels.attr("transform", (dataGroup: DotPlotDataGroup) => {
                        const size: ISize = dataGroup.size;

                        if (DotPlot.DefaultValues.labelOrientation === DotPlotLabelsOrientation.Vertical) {
                            const px: number = dataGroup.anchorPoint.x,
                                py: number = dataGroup.anchorPoint.y,
                                dx: number = size.width / DotPlot.DataLabelXOffset
                                    + size.height * DotPlot.DataLabelXOffsetIndex,
                                dy: number = size.height + size.height / DotPlot.DataLabelYOffset;

                            return translateAndRotate(dx, -dy, px, py, DotPlot.DataLabelAngle);
                        } else {
                            const dx = size.width / DotPlot.DataLabelXOffset,
                                dy = size.height / DotPlot.DataLabelYOffset;

                            return translate(dx, dy);
                        }
                    });
                }
            }
            else {
                dataLabelUtils.cleanDataLabels(this.svg);
            }
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            if (!this.settings) {
                return [];
            }

            return DotPlotSettings.enumerateObjectInstances(this.settings, options);
        }

        private drawDotPlot(): void {
            const dotGroupSelection: UpdateSelection<DotPlotDataGroup> = this.dotPlot
                .selectAll(this.dotPlotSelectors.plotGroupSelector.selector)
                .data(this.data.dataGroups);

            const hasSelection: boolean = this.interactivityService
                && this.interactivityService.hasSelection();

            dotGroupSelection
                .enter()
                .append("g")
                .classed(this.dotPlotSelectors.plotGroupSelector.class, true);

            dotGroupSelection
                .attr({
                    'transform': (dataPoint: DotPlotDataGroup) => {
                        return translate(
                            this.getXDotPositionByIndex(dataPoint.index),
                            this.layout.margin.top + this.data.labelFontSize);
                    },
                    'stroke': "black",
                    "stroke-width": this.strokeWidth
                })
                .style("fill-opacity", (item: DotPlotDataGroup) => {
                    return getFillOpacity(
                        item.selected,
                        item.highlight,
                        hasSelection,
                        false);
                });

            var circleSelection = dotGroupSelection
                .selectAll(this.dotPlotSelectors.circleSeletor.selector)
                .data((dataPoint: DotPlotDataGroup) => {
                    return dataPoint.dataPoints;
                });

            circleSelection
                .enter()
                .append("circle")
                .classed(this.dotPlotSelectors.circleSeletor.class, true);

            circleSelection.attr({
                cy: (dataPoint: DotPlotDataPoint) => dataPoint.y,
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

            if (this.interactivityService) {
                this.interactivityService.applySelectionStateToData(this.data.dataGroups);

                var behaviorOptions: DotplotBehaviorOptions = {
                    columns: dotGroupSelection,
                    clearCatcher: this.clearCatcher,
                    interactivityService: this.interactivityService,
                };

                this.interactivityService.bind(
                    this.data.dataGroups,
                    this.behavior,
                    behaviorOptions);
            }
        }

        private getXDotPositionByIndex(index: number): number {
            var scale: OrdinalScale<number, number> = this.xAxisProperties.scale;

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
            this.dotPlot
                .selectAll("*")
                .remove();

            this.xAxisSelection
                .selectAll("*")
                .remove();

            dataLabelUtils.cleanDataLabels(this.svg);

            this.svg.style({
                height: PixelConverter.toString(0),
                width: PixelConverter.toString(0)
            });
        }

        private renderTooltip(selection: UpdateSelection<DotPlotDataGroup>): void {
            this.tooltipServiceWrapper.addTooltip(
                selection,
                (tooltipEvent: TooltipEventArgs<DotPlotDataGroup>) => {
                    return tooltipEvent.data.tooltipInfo;
                });
        }

        private calculateAxes(): void {
            var pixelSpan = this.dataViewport.width - this.data.maxLabelWidth;

            var xAxisProperties = createAxis({
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

                return textMeasurementService.getTailoredTextOrDefault(textProperties, tickWidth);
            });

            if (this.settings.categoryAxis.show) {
                // Should handle the label, units of the label and the axis style
                xAxisProperties.axisLabel = this.data.categoryAxisName;
            }

            this.xAxisProperties = xAxisProperties;
        }

        private renderAxis(duration: number): void {
            const height: number = this.dataViewport.height - this.data.maxXAxisHeight;

            this.xAxisSelection.attr(
                "transform",
                translate(this.data.maxLabelWidth / 2, height));

            const xAxis: Axis = this.xAxisProperties.axis.orient("bottom");

            this.xAxisSelection
                .transition()
                .duration(duration)
                .call(xAxis)
                .selectAll("g.tick text")
                .style("fill", this.settings.categoryAxis.labelColor);

            this.xAxisSelection.selectAll(".tick text")
                .append("title")
                .text((index: number) => {
                    return this.data.dataGroups[index]
                        && this.data.dataGroups[index].category.value;
                });

            this.xAxisSelection
                .selectAll("line")
                .style("opacity", this.settings.categoryAxis.show ? 1 : 0);

            this.xAxisSelection
                .selectAll(".xAxisLabel")
                .remove();

            if (this.settings.categoryAxis.showAxisTitle) {
                const titleWidth: number = textMeasurementService.measureSvgTextWidth(
                    DotPlot.getCategoryTextProperties(this.data.categoryAxisName));

                this.xAxisSelection
                    .append("text")
                    .text(this.data.categoryAxisName)
                    .style("text-anchor", "middle")
                    .attr("class", "xAxisLabel")
                    .style("fill", this.settings.categoryAxis.labelColor)
                    .attr("transform", translate(
                        this.dataViewport.width / 2 - titleWidth / 2,
                        this.data.maxXAxisHeight - this.data.categoryLabelHeight + 11));
            }
        }
    }
}
