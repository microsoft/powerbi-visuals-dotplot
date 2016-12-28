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
    import LogScale = d3.scale.Log;
    import Selection = d3.Selection;
    import LinearScale = d3.scale.Linear;
    import OrdinalScale = d3.scale.Ordinal;
    import UpdateSelection = d3.selection.Update;

    // powerbi.visuals
    import ISelectionId = powerbi.visuals.ISelectionId;

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
    import IMargin = powerbi.extensibility.utils.svg.IMargin;
    import ISize = powerbi.extensibility.utils.svg.shapes.ISize;
    import translate = powerbi.extensibility.utils.svg.translate;
    import translateAndRotate = powerbi.extensibility.utils.svg.translateAndRotate;
    import ClassAndSelector = powerbi.extensibility.utils.svg.CssConstants.ClassAndSelector;
    import createClassAndSelector = powerbi.extensibility.utils.svg.CssConstants.createClassAndSelector;

    // powerbi.extensibility.utils.tooltip
    import TooltipEventArgs = powerbi.extensibility.utils.tooltip.TooltipEventArgs;
    import ITooltipServiceWrapper = powerbi.extensibility.utils.tooltip.ITooltipServiceWrapper;
    import createTooltipServiceWrapper = powerbi.extensibility.utils.tooltip.createTooltipServiceWrapper;

    export class DotPlot implements IVisual {
        private static MinOpacity: number = 0;
        private static MaxOpacity: number = 1;

        private static ScrollableContainerSelector: ClassAndSelector = createClassAndSelector("dotPlotScrollableContainer");
        private static SvgPlotSelector: ClassAndSelector = createClassAndSelector("dotplot");
        private static PlotSelector: ClassAndSelector = createClassAndSelector("dotplotSelector");
        private static PlotGroupSelector: ClassAndSelector = createClassAndSelector("dotplotGroup");
        private static AxisSelector: ClassAndSelector = createClassAndSelector("axisGraphicsContext");
        private static XAxisSelector: ClassAndSelector = createClassAndSelector("x axis");
        private static CircleSelector: ClassAndSelector = createClassAndSelector("circleSelector");
        private static TickTextSelector: ClassAndSelector = createClassAndSelector("tick text");
        private static XAxisLabelSelector: ClassAndSelector = createClassAndSelector("xAxisLabel");

        private static DataLabelXOffset: number = 2;
        private static DataLabelYOffset: number = 1.5;

        private static DataLabelAngle: number = -90;
        private static DataLabelXOffsetIndex: number = 0.3;

        private static DefaultRadius: number = 5;
        private static DefaultStrokeWidth: number = 1;

        private static DefaultFontSize: number = 11;
        private static DefaultFontFamily: string = "helvetica,arial,sans-serif";

        private static DefaultValue: number = 0;

        private static MinCategoryAxisHeight: number = 0;
        private static DefaultCategoryAxisHeight: number = 20;

        private static MinCategoryLabelHeight: number = 0;
        private static DefaultCategoryLabelHeight: number = 15;

        private static DefaultCategoryText: string = "W";

        private static MaxLabelWidth: number = 50;

        private static DefaultLabelText: string = "0";
        private static LabelWidthFactor: number = 0.8;

        private static RadiusFactor: number = 2;
        private static ExtraDiameter: number = 1;
        private static ExtraDiameterOfDataGroups: number = 2;

        private static MinDomainValue: number = 0;
        private static DefaultDomainValue: number = 1;

        private static MinAmountOfDots: number = 0;

        private static DotGroupStrokeColor: string = "black";

        private static MiddleLabelWidth: number = 2;

        private static AxisDisplayUnits: number = 0;
        private static OuterPadding: number = 0;

        private static MinCategoryWidth: number = 75;

        private static DataGroupsScaleDomainMinValue: number = -1;
        private static MinAmountOfTicks: number = 1;
        private static TickWidthOffset: number = 3;

        private static XAxisSeparator: number = 2;
        private static XAxisLabelOffset: number = 11;

        private static DefaultTickValue: string = "";

        private static TextAnchor: string = "middle";

        private static Margin: IMargin = {
            top: 5,
            bottom: 15,
            right: 0,
            left: 0
        };

        private static getCategoryTextProperties(
            text?: string,
            fontSize: number = DotPlot.DefaultFontSize): TextProperties {

            return {
                text,
                fontFamily: DotPlot.DefaultFontFamily,
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

        private visualHost: IVisualHost;

        private tooltipServiceWrapper: ITooltipServiceWrapper;

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
            radius: number,
            visualHost: IVisualHost): DotPlotData {

            if (!dataView
                || !dataView.categorical
                || _.isEmpty(dataView.categorical.values)
                || _.isEmpty(dataView.categorical.categories)) {

                return null;
            }

            const settings: DotPlotSettings = this.parseSettings(dataView),
                categoryColumn: DataViewCategoryColumn = dataView.categorical.categories[0],
                valueColumn: DataViewValueColumn = dataView.categorical.values[0],
                valueValues: number[] = valueColumn.values.map((value: number) => {
                    return value || DotPlot.DefaultValue;
                }) as number[];

            const minValue: number = _.min<number>(valueValues),
                maxValue: number = _.max<number>(valueValues);

            const valuesFormatter: IValueFormatter = valueFormatter.create({
                format: valueFormatter.getFormatStringByColumn(valueColumn.source),
                precision: settings.labels.labelPrecision,
                value: settings.labels.labelDisplayUnits || maxValue
            });

            const formattedValues: string[] = valueValues.map(valuesFormatter.format);

            const categoriesFormatter: IValueFormatter = valueFormatter.create({
                format: valueFormatter.getFormatStringByColumn(categoryColumn.source)
            });

            const categories: DotPlotChartCategory[] = categoryColumn.values
                .map((value: PrimitiveValue, index: number) => {
                    const selectionId: ISelectionId = visualHost
                        .createSelectionIdBuilder()
                        .withCategory(categoryColumn, index)
                        .createSelectionId();

                    return {
                        selectionId,
                        value: categoriesFormatter.format(value)
                    };
                });

            const labelFontSize: number = PixelConverter.fromPointToPixel(settings.labels.fontSize);

            const maxXAxisHeight: number =
                (settings.categoryAxis.show
                    ? DotPlot.DefaultCategoryAxisHeight
                    : DotPlot.MinCategoryAxisHeight)
                +
                (settings.categoryAxis.showAxisTitle
                    ? DotPlot.DefaultCategoryLabelHeight
                    : DotPlot.MinCategoryLabelHeight);

            const maxCategoryLength: number = _.max(categories.map((category: DotPlotChartCategory) => {
                return category.value.length;
            }));

            const maxCategoryWidth: number = maxCategoryLength
                * textMeasurementService.measureSvgTextWidth(
                    DotPlot.getCategoryTextProperties(DotPlot.DefaultCategoryText));

            const maxLabelLength: number = _.max(formattedValues.map((value: string) => {
                return value.length;
            }));

            const maxLabelWidth: number = Math.max(
                DotPlot.MaxLabelWidth,
                maxLabelLength
                * textMeasurementService.measureSvgTextWidth(
                    DotPlot.getCategoryTextProperties(
                        DotPlot.DefaultLabelText,
                        labelFontSize))
                * DotPlot.LabelWidthFactor);

            const diameter: number = DotPlot.RadiusFactor * radius + DotPlot.ExtraDiameter,
                dotsTotalHeight: number = height - maxXAxisHeight
                    - radius * DotPlot.RadiusFactor - labelFontSize,
                maxDots: number = Math.floor(dotsTotalHeight / diameter);

            const yScale: LinearScale<number, number> = d3.scale.linear()
                .domain([DotPlot.MinAmountOfDots, maxDots])
                .range([dotsTotalHeight, DotPlot.MinAmountOfDots]);

            const dataPointsGroup: DotPlotDataGroup[] = [],
                minDots = minValue / (maxValue / maxDots);

            const dotScale: LogScale<number, number> = d3.scale.log()
                .domain(DotPlot.getDomain(minValue, maxValue))
                .range(DotPlot.getDomain(minDots, maxDots))
                .clamp(true);

            for (let index: number = 0, length: number = valueValues.length; index < length; index++) {
                const value: number = valueValues[index],
                    scaledValue: number = dotScale(value),
                    dataPoints: DotPlotDataPoint[] = [];

                for (let level: number = 0; level < scaledValue && maxDots > DotPlot.MinAmountOfDots; level++) {
                    dataPoints.push({
                        y: yScale(level),
                        tooltipInfo: DotPlot.getTooltipData(value
                            .toFixed(settings.labels.labelPrecision)
                            .toString())
                    });
                }

                const categorySelectionId: ISelectionId = visualHost
                    .createSelectionIdBuilder()
                    .withCategory(categoryColumn, index)
                    .createSelectionId();

                const tooltipInfo: VisualTooltipDataItem[] = DotPlot.getTooltipData(
                    value.toFixed(settings.labels.labelPrecision));

                dataPointsGroup.push({
                    value,
                    dataPoints,
                    tooltipInfo,
                    color: settings.dataPoint.fill,
                    category: categories[index],
                    label: formattedValues[index],
                    identity: categorySelectionId,
                    selected: false,
                    highlight: false,
                    index: dataPointsGroup.length,
                    labelFontSize: PixelConverter.toString(labelFontSize)
                });
            }

            return {
                categoryColumn,
                settings,
                maxXAxisHeight,
                labelFontSize,
                dotsTotalHeight,
                maxLabelWidth,
                maxCategoryWidth,
                dataGroups: dataPointsGroup,
                categoryAxisName: categoryColumn.source.displayName,
                categoryLabelHeight: DotPlot.DefaultCategoryLabelHeight
            };
        }

        private static getDomain(min: number, max: number): number[] {
            const left: number = min < DotPlot.MinDomainValue
                ? DotPlot.DefaultDomainValue
                : min;

            return [left, max];
        }

        private static parseSettings(dataView: DataView): DotPlotSettings {
            const settings: DotPlotSettings = DotPlotSettings.parse<DotPlotSettings>(dataView);

            settings.labels.labelPrecision = Math.min(
                Math.max(
                    LabelsSettings.MinLabelPrecision,
                    settings.labels.labelPrecision),
                LabelsSettings.MaxLabelPrecision);

            return settings;
        }

        public constructor(options: VisualConstructorOptions) {
            this.init(options);
        }

        public init(options: VisualConstructorOptions): void {
            this.behavior = new DotplotBehavior();

            this.visualHost = options.host;

            this.tooltipServiceWrapper = createTooltipServiceWrapper(
                this.visualHost.tooltipService,
                options.element);

            this.interactivityService = createInteractivityService(this.visualHost);

            this.colorPalette = this.visualHost.colorPalette;

            this.layout = new VisualLayout(null, DotPlot.Margin);

            this.divContainer = d3.select(options.element)
                .append("div")
                .classed(DotPlot.ScrollableContainerSelector.class, true);

            this.svg = this.divContainer
                .append("svg")
                .classed(DotPlot.SvgPlotSelector.class, true);

            this.clearCatcher = appendClearCatcher(this.svg);

            const axisGraphicsContext: Selection<any> = this.svg
                .append("g")
                .classed(DotPlot.AxisSelector.class, true);

            this.dotPlot = this.svg
                .append("g")
                .classed(DotPlot.PlotSelector.class, true);

            this.xAxisSelection = axisGraphicsContext
                .append("g")
                .classed(DotPlot.XAxisSelector.class, true);
        }

        public update(options: VisualUpdateOptions): void {
            if (!options) {
                return;
            }

            this.layout.viewport = options.viewport;

            const data: DotPlotData = DotPlot.converter(
                options.dataViews && options.dataViews[0],
                this.layout.viewportIn.height,
                this.colorPalette,
                this.radius,
                this.visualHost);

            if (!data) {
                this.clear();
                return;
            }

            this.data = data;

            this.dataViewport = {
                height: this.layout.viewportIn.height,
                width: Math.max(
                    this.layout.viewportIn.width,
                    this.data.dataGroups.length
                    * (this.radius * DotPlot.RadiusFactor + DotPlot.ExtraDiameterOfDataGroups)
                    + this.data.maxLabelWidth)
            };

            this.svg.style({
                height: PixelConverter.toString(this.dataViewport.height),
                width: PixelConverter.toString(this.dataViewport.width)
            });

            this.divContainer.style({
                width: PixelConverter.toString(this.layout.viewport.width),
                height: PixelConverter.toString(this.layout.viewport.height)
            });

            if (this.interactivityService) {
                this.interactivityService.applySelectionStateToData(this.data.dataGroups);
            }

            this.calculateAxes();

            this.renderAxis(this.durationAnimations);

            this.drawDotPlot();

            if (this.settings.labels.show) {
                const layout: ILabelLayout = this.getDotPlotLabelsLayout();

                const labels: UpdateSelection<DotPlotDataGroup> = dataLabelUtils.drawDefaultLabelsForDataPointChart(
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
                            const dx: number = size.width / DotPlot.DataLabelXOffset,
                                dy: number = size.height / DotPlot.DataLabelYOffset;

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
                .selectAll(DotPlot.PlotGroupSelector.selector)
                .data(this.data.dataGroups);

            const hasSelection: boolean = this.interactivityService
                && this.interactivityService.hasSelection();

            dotGroupSelection
                .enter()
                .append("g")
                .classed(DotPlot.PlotGroupSelector.class, true);

            dotGroupSelection
                .attr({
                    "transform": (dataPoint: DotPlotDataGroup) => {
                        return translate(
                            this.getXDotPositionByIndex(dataPoint.index),
                            this.layout.margin.top + this.data.labelFontSize);
                    },
                    "stroke": DotPlot.DotGroupStrokeColor,
                    "stroke-width": this.strokeWidth
                })
                .style("fill-opacity", (item: DotPlotDataGroup) => {
                    return getFillOpacity(
                        item.selected,
                        item.highlight,
                        hasSelection,
                        false);
                });

            const circleSelection: UpdateSelection<DotPlotDataPoint> = dotGroupSelection
                .selectAll(DotPlot.CircleSelector.selector)
                .data((dataPoint: DotPlotDataGroup) => {
                    return dataPoint.dataPoints;
                });

            circleSelection
                .enter()
                .append("circle")
                .classed(DotPlot.CircleSelector.class, true);

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

                const behaviorOptions: DotplotBehaviorOptions = {
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
            const scale: OrdinalScale<number, number> = this.xAxisProperties.scale;

            return this.data.maxLabelWidth / DotPlot.MiddleLabelWidth + scale(index);
        }

        private getDotPlotLabelsLayout(): ILabelLayout {
            return {
                labelText: (dataGroup: DotPlotDataGroup) => {
                    return dataLabelUtils.getLabelFormattedText({
                        label: dataGroup.label,
                        fontSize: parseFloat(this.settings.labels.fontSize as any),
                        maxWidth: this.dataViewport.width,
                    });
                },
                labelLayout: {
                    x: (dataGroup: DotPlotDataGroup) => {
                        const x: number = this.getXDotPositionByIndex(dataGroup.index),
                            dx: number = dataGroup.size.width / DotPlot.DataLabelXOffset;

                        return x - dx;
                    },
                    y: (dataGroup: DotPlotDataGroup) => {
                        const y: number = (_.isEmpty(dataGroup.dataPoints)
                            ? this.data.dotsTotalHeight + this.radius * DotPlot.RadiusFactor
                            : _.last(dataGroup.dataPoints).y) + this.data.labelFontSize;

                        return y - dataGroup.size.height;
                    }
                },
                filter: (dataGroup: DotPlotDataGroup) => {
                    return !!(dataGroup
                        && dataGroup.dataPoints
                        && this.layout.viewportIn.height
                        - this.data.maxXAxisHeight
                        + this.radius * DotPlot.RadiusFactor > this.data.labelFontSize);
                },
                style: {
                    "fill": this.settings.labels.color,
                    "font-size": PixelConverter.toString(this.data.labelFontSize),
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
                height: PixelConverter.toString(VisualLayout.MinViewportSize),
                width: PixelConverter.toString(VisualLayout.MinViewportSize)
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
            const pixelSpan: number = this.dataViewport.width - this.data.maxLabelWidth;

            const xAxisProperties: IAxisProperties = createAxis({
                pixelSpan: pixelSpan,
                dataDomain: [
                    DotPlot.MinDomainValue,
                    this.data.dataGroups.length - 1
                ],
                metaDataColumn: null,
                formatString: null,
                outerPadding: DotPlot.OuterPadding,
                isScalar: true,
                isVertical: false,
                forcedTickCount: Math.min(
                    this.data.dataGroups.length,
                    Math.floor(
                        (pixelSpan + this.data.maxCategoryWidth)
                        / Math.min(DotPlot.MinCategoryWidth, this.data.maxCategoryWidth))),
                useTickIntervalForDisplayUnits: true,
                isCategoryAxis: false,
                scaleType: this.scaleType,
                axisDisplayUnits: DotPlot.AxisDisplayUnits
            });

            const scale: any = xAxisProperties.axis.scale();

            scale.domain([
                DotPlot.DataGroupsScaleDomainMinValue,
                this.data.dataGroups.length
            ]);

            const tickValues: any[] = xAxisProperties.axis
                .tickValues()
                .filter((value: number) => value < this.data.dataGroups.length);

            xAxisProperties.axis.tickValues(tickValues);

            const tickWidth: number = (tickValues.length > DotPlot.MinAmountOfTicks
                ? scale(tickValues[1]) - scale(tickValues[0])
                : pixelSpan) - DotPlot.TickWidthOffset;

            xAxisProperties.axis.tickFormat((index: number) => {
                if (!this.settings.categoryAxis.show || !this.data.dataGroups[index]) {
                    return DotPlot.DefaultTickValue;
                }

                const textProperties: TextProperties = DotPlot.getCategoryTextProperties(
                    this.data.dataGroups[index].category.value);

                return textMeasurementService.getTailoredTextOrDefault(
                    textProperties,
                    tickWidth);
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
                translate(
                    this.data.maxLabelWidth / DotPlot.MiddleLabelWidth,
                    height));

            const xAxis: Axis = this.xAxisProperties.axis.orient("bottom");

            this.xAxisSelection
                .transition()
                .duration(duration)
                .call(xAxis)
                .selectAll(`g${DotPlot.TickTextSelector.selector}`)
                .style("fill", this.settings.categoryAxis.labelColor);

            this.xAxisSelection.selectAll(DotPlot.TickTextSelector.selector)
                .append("title")
                .text((index: number) => {
                    return this.data.dataGroups[index]
                        && this.data.dataGroups[index].category.value;
                });

            this.xAxisSelection
                .selectAll("line")
                .style("opacity", this.settings.categoryAxis.show
                    ? DotPlot.MaxOpacity
                    : DotPlot.MinOpacity);

            this.xAxisSelection
                .selectAll(DotPlot.XAxisLabelSelector.selector)
                .remove();

            if (this.settings.categoryAxis.showAxisTitle) {
                const titleWidth: number = textMeasurementService.measureSvgTextWidth(
                    DotPlot.getCategoryTextProperties(this.data.categoryAxisName));

                this.xAxisSelection
                    .append("text")
                    .text(this.data.categoryAxisName)

                    .style({
                        "text-anchor": DotPlot.TextAnchor,
                        "fill": this.settings.categoryAxis.labelColor
                    })
                    .attr({
                        "class": DotPlot.XAxisLabelSelector.class,
                        "transform": translate(
                            this.dataViewport.width / DotPlot.XAxisSeparator - titleWidth / DotPlot.XAxisSeparator,
                            this.data.maxXAxisHeight - this.data.categoryLabelHeight + DotPlot.XAxisLabelOffset)
                    });
            }
        }
    }
}
