
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

import "@babel/polyfill";
import * as d3 from "d3";

import { isEmpty } from "lodash/lang";
import { min, max } from "lodash/math";
import { last } from "lodash/array";

import powerbi from "powerbi-visuals-api";

import { VisualLayout } from "./layout";
import { DotplotBehavior, DotplotBehaviorOptions } from "./behavior";
import { getOpacity } from "./utils";
import { DotPlotData, DotPlotChartCategory, DotPlotDataGroup, DotPlotDataPoint, DotPlotLabelsOrientation } from "./dataInterfaces";
import { DotPlotSettings, LabelsSettings } from "./settings";

import IViewport = powerbi.IViewport;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import IColorPalette = powerbi.extensibility.IColorPalette;

import DataView = powerbi.DataView;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumn = powerbi.DataViewValueColumn;
import PrimitiveValue = powerbi.PrimitiveValue;

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;

// d3
import { Axis } from "d3-axis";
import { ScaleLogarithmic as LogScale, ScaleLinear as LinearScale, ScaleOrdinal as OrdinalScale } from "d3-scale";
type Selection<T> = d3.Selection<any, T, any, any>;

// powerbi.visuals
import ISelectionId = powerbi.visuals.ISelectionId;

// powerbi-visuals-utils-formattingutils
import { valueFormatter as vf, textMeasurementService as tms } from "powerbi-visuals-utils-formattingutils";
import valueFormatter = vf.valueFormatter;
import TextProperties = tms.TextProperties;
import IValueFormatter = vf.IValueFormatter;
import textMeasurementService = tms.textMeasurementService;

// powerbi-visuals-utils-typeutils
import { pixelConverter as PixelConverter } from "powerbi-visuals-utils-typeutils";

// powerbi-visuals-utils-interactivityutils
import { interactivityService } from "powerbi-visuals-utils-interactivityutils";
import appendClearCatcher = interactivityService.appendClearCatcher;
import IInteractiveBehavior = interactivityService.IInteractiveBehavior;
import IInteractivityService = interactivityService.IInteractivityService;
import createInteractivityService = interactivityService.createInteractivityService;

// powerbi-visuals-utils-chartutils
import { axis, dataLabelUtils, dataLabelInterfaces, axisInterfaces, axisScale } from "powerbi-visuals-utils-chartutils";
import AxisScale = axisScale;
import createAxis = axis.createAxis;
import ILabelLayout = dataLabelInterfaces.ILabelLayout;
import IAxisProperties = axisInterfaces.IAxisProperties;
import LabelTextProperties = dataLabelUtils.LabelTextProperties;

// powerbi-visuals-utils-svgutils
import { IMargin, shapesInterfaces, CssConstants, manipulation } from "powerbi-visuals-utils-svgutils";
import ISize = shapesInterfaces.ISize;
import translate = manipulation.translate;
import translateAndRotate = manipulation.translateAndRotate;
import ClassAndSelector = CssConstants.ClassAndSelector;
import createClassAndSelector = CssConstants.createClassAndSelector;

// powerbi-visuals-utils-tooltiputils
import { TooltipEventArgs, ITooltipServiceWrapper, createTooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";

// powerbi-visuals-utils-colorutils
import { ColorHelper } from "powerbi-visuals-utils-colorutils";

const ValueText = "Visual_Value";

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

    private static MinLabelLength: number = 0;

    private static Margin: IMargin = {
        top: 5,
        bottom: 15,
        right: 0,
        left: 0
    };

    private static getCategoryTextProperties(
        text?: string,
        fontSize: number = DotPlot.DefaultFontSize
    ): TextProperties {

        return {
            text,
            fontFamily: DotPlot.DefaultFontFamily,
            fontSize: PixelConverter.toString(fontSize),
        };
    }

    private get settings() {
        return this.data && this.data.settings;
    }
    public layout: VisualLayout;
    public name: string;
    public title: string;

    private events: IVisualEventService;
    private divContainer: Selection<any>;
    private svg: Selection<any>;
    private xAxisSelection: Selection<any>;
    private dotPlot: Selection<any>;
    private clearCatcher: Selection<any>;
    private behavior: IInteractiveBehavior;

    private colorPalette: IColorPalette;
    private colorHelper: ColorHelper;
    private durationAnimations: number = 0;

    private data: DotPlotData;
    private dataViewport: IViewport;
    private xAxisProperties: IAxisProperties;

    private interactivityService: IInteractivityService;
    private scaleType: string = AxisScale.linear;

    private strokeWidth: number = 1;
    private static verticalLabelMarginRatio: number = 0.2;

    private visualHost: IVisualHost;

    private tooltipServiceWrapper: ITooltipServiceWrapper;

    private static DefaultValues = {
        labelOrientation: DotPlotLabelsOrientation.Horizontal
    };

    private static getTooltipData(value: any, localizationManager: ILocalizationManager): VisualTooltipDataItem[] {
        return [{
            displayName: localizationManager.getDisplayName(ValueText),
            value: value.toString()
        }];
    }

    public static converter(
        dataView: DataView,
        height: number,
        colors: IColorPalette,
        colorHelper: ColorHelper,
        visualHost: IVisualHost,
        layout: VisualLayout
    ): DotPlotData {

        if (!dataView
            || !dataView.categorical
            || isEmpty(dataView.categorical.values)
            || isEmpty(dataView.categorical.categories)) {

            return null;
        }
        const settings: DotPlotSettings = this.parseSettings(dataView, colorHelper),
            categoryColumn: DataViewCategoryColumn = dataView.categorical.categories[0],
            valueColumn: DataViewValueColumn = dataView.categorical.values[0],
            valueValues: number[] = valueColumn.values.map((value: PrimitiveValue) => {
                const convertedValue: number = Number(value);

                return convertedValue || DotPlot.DefaultValue;
            }) as number[],
            localizationManager: ILocalizationManager = visualHost.createLocalizationManager();

        const minValue: number = min<number>(valueValues),
            maxValue: number = max<number>(valueValues);

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

        const maxCategoryLength: number = max(categories.map((category: DotPlotChartCategory) => {
            return category.value.length;
        }));

        const maxCategoryWidth: number = maxCategoryLength
            * textMeasurementService.measureSvgTextWidth(
                DotPlot.getCategoryTextProperties(DotPlot.DefaultCategoryText));

        const maxLabelLength: number = max(formattedValues.map((value: string) => {
            return value.length;
        })) || DotPlot.MinLabelLength;

        const maxLabelWidth: number = Math.max(
            DotPlot.MaxLabelWidth,
            maxLabelLength
            * textMeasurementService.measureSvgTextWidth(
                DotPlot.getCategoryTextProperties(
                    "M",
                    labelFontSize))
            * DotPlot.LabelWidthFactor);

        const maxLabelHeight: number = settings.labels.orientation === DotPlotLabelsOrientation.Vertical
            ? maxLabelWidth
            : 0;

        const radius: number = settings.dataPoint.radius;

        const diameter: number = DotPlot.RadiusFactor * radius + DotPlot.ExtraDiameter,
            dotsTotalHeight: number = height - maxXAxisHeight
                - radius * DotPlot.RadiusFactor - labelFontSize - layout.margin.top - maxLabelHeight,
            maxDots: number = Math.floor(dotsTotalHeight / diameter);

        const yScale: LinearScale<number, number> = d3.scaleLinear()
            .domain([DotPlot.MinAmountOfDots, maxDots])
            .range([dotsTotalHeight, DotPlot.MinAmountOfDots]);

        const dataPointsGroup: DotPlotDataGroup[] = [],
            minDots = minValue / (maxValue / maxDots),
            additionalValue = minValue <= 1 ? -minValue + 1 : 0; // negative values scales incorrect

        const dotScale: LogScale<number, number> = d3.scaleLog()
            .domain(DotPlot.getDomain(minValue + additionalValue, maxValue + additionalValue))
            .range(DotPlot.getDomain(minDots > maxDots ? 1 : minDots, maxDots))
            .clamp(true);

        for (let index: number = 0, length: number = valueValues.length; index < length; index++) {
            const value: number = valueValues[index],
                scaledValue: number = dotScale(value + additionalValue),
                dataPoints: DotPlotDataPoint[] = [];

            for (let level: number = 0; level < scaledValue && maxDots > DotPlot.MinAmountOfDots; level++) {
                dataPoints.push({
                    y: yScale(level),
                    tooltipInfo: DotPlot.getTooltipData(value
                        .toFixed(settings.labels.labelPrecision)
                        .toString(), localizationManager)
                });
            }

            const categorySelectionId: ISelectionId = visualHost
                .createSelectionIdBuilder()
                .withCategory(categoryColumn, index)
                .createSelectionId();

            const tooltipInfo: VisualTooltipDataItem[] = DotPlot.getTooltipData(
                value.toFixed(settings.labels.labelPrecision), localizationManager);

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
            maxLabelHeight,
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

    private static parseSettings(dataView: DataView, colorHelper: ColorHelper): DotPlotSettings {
        const settings: DotPlotSettings = DotPlotSettings.parse<DotPlotSettings>(dataView);

        settings.labels.labelPrecision = Math.min(
            Math.max(
                LabelsSettings.MinLabelPrecision,
                settings.labels.labelPrecision),
            LabelsSettings.MaxLabelPrecision);

        settings.dataPoint.parse();

        // convert colors for high contrast mode
        settings.categoryAxis.labelColor = colorHelper.getHighContrastColor("foreground", settings.categoryAxis.labelColor);
        settings.dataPoint.fill = colorHelper.getHighContrastColor("foreground", settings.dataPoint.fill);
        settings.labels.color = colorHelper.getHighContrastColor("foreground", settings.labels.color);

        return settings;
    }

    public constructor(options: VisualConstructorOptions) {
        this.init(options);
    }

    private init(options: VisualConstructorOptions): void {
        this.events = options.host.eventService;

        this.behavior = new DotplotBehavior();

        this.visualHost = options.host as IVisualHost;

        this.tooltipServiceWrapper = createTooltipServiceWrapper(
            this.visualHost.tooltipService,
            options.element);

        this.interactivityService = createInteractivityService(this.visualHost);

        this.colorPalette = this.visualHost.colorPalette;
        this.colorHelper = new ColorHelper(this.colorPalette);

        this.layout = new VisualLayout(null, DotPlot.Margin);

        this.divContainer = d3.select(options.element)
            .append("div")
            .classed(DotPlot.ScrollableContainerSelector.className, true);

        this.svg = this.divContainer
            .append("svg")
            .classed(DotPlot.SvgPlotSelector.className, true);

        this.clearCatcher = appendClearCatcher(this.svg);

        const axisGraphicsContext: Selection<any> = this.svg
            .append("g")
            .classed(DotPlot.AxisSelector.className, true);

        this.dotPlot = this.svg
            .append("g")
            .classed(DotPlot.PlotSelector.className, true);

        this.xAxisSelection = axisGraphicsContext
            .append("g")
            .classed(DotPlot.XAxisSelector.className, true);
    }

    public update(options: VisualUpdateOptions): void {
        if (!options) {
            return;
        }

        try {
            this.events.renderingStarted(options);

            const dataView: DataView = options.dataViews && options.dataViews[0]
                ? options.dataViews[0]
                : null;

            this.layout.viewportIn.height = this.layout.viewportIn.height;
            this.layout.viewport = options.viewport;

            const data: DotPlotData = DotPlot.converter(
                dataView,
                this.layout.viewportIn.height,
                this.colorPalette,
                this.colorHelper,
                this.visualHost,
                this.layout
            );

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
                    * (this.data.settings.dataPoint.radius * DotPlot.RadiusFactor + DotPlot.ExtraDiameterOfDataGroups)
                    + this.data.maxLabelWidth)
            };

            this.svg
                .style("height", PixelConverter.toString(this.dataViewport.height))
                .style("width", PixelConverter.toString(this.dataViewport.width));

            this.divContainer
                .style("width", PixelConverter.toString(this.layout.viewport.width))
                .style("height", PixelConverter.toString(this.layout.viewport.height));

            if (this.interactivityService) {
                this.interactivityService.applySelectionStateToData(this.data.dataGroups);
            }

            this.calculateAxes();

            this.renderAxis(this.durationAnimations);

            this.drawDotPlot();

            if (this.settings.labels.show) {
                const layout: ILabelLayout = this.getDotPlotLabelsLayout();

                const labels: Selection<DotPlotDataGroup> = dataLabelUtils.drawDefaultLabelsForDataPointChart(
                    this.data.dataGroups,
                    this.svg,
                    layout,
                    this.dataViewport,
                    false,
                    this.durationAnimations);

                if (labels) {
                    labels.attr("transform", (dataGroup: DotPlotDataGroup) => {
                        const size: ISize = dataGroup.size;
                        if (data.settings.labels.orientation === DotPlotLabelsOrientation.Vertical) {
                            const px: number = dataGroup.anchorPoint.x,
                                py: number = dataGroup.anchorPoint.y,
                                dx: number = size.width / DotPlot.DataLabelXOffset
                                    + size.height * DotPlot.DataLabelXOffsetIndex,
                                dy: number = size.height + size.height / DotPlot.DataLabelYOffset;
                            return translateAndRotate(dx, -dy + this.data.maxLabelHeight - (DotPlot.MaxLabelWidth >= this.data.maxLabelHeight ? 0 : this.data.maxLabelHeight * DotPlot.verticalLabelMarginRatio), px, py, DotPlot.DataLabelAngle);
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

            this.events.renderingFinished(options);
        } catch (e) {
            console.error(e);
            this.events.renderingFailed(options);
        }
    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
        if (!this.settings) {
            return [];
        }

        return DotPlotSettings.enumerateObjectInstances(this.settings, options);
    }

    private drawDotPlot(): void {
        let dotGroupSelection: Selection<DotPlotDataGroup> = this.dotPlot
            .selectAll(DotPlot.PlotGroupSelector.selectorName)
            .data(this.data.dataGroups);

            const hasSelection: boolean = this.interactivityService
            && this.interactivityService.hasSelection();

        let newDotGroupSelection: Selection<DotPlotDataGroup> = dotGroupSelection
            .enter()
            .append("g")
            .classed(DotPlot.PlotGroupSelector.className, true);

        dotGroupSelection
            .merge(newDotGroupSelection)
            .attr("transform", (dataPoint: DotPlotDataGroup) => {
                return translate(
                    this.getXDotPositionByIndex(dataPoint.index),
                    this.layout.margin.top + this.data.labelFontSize + this.data.maxLabelHeight);
                })
            .attr("stroke", (dataPoint: DotPlotDataGroup) => this.colorHelper.isHighContrast ? dataPoint.color : DotPlot.DotGroupStrokeColor)
            .attr("stroke-width", this.strokeWidth)
            .style("fill-opacity", (item: DotPlotDataGroup) => {
                return getOpacity(
                    item.selected,
                    item.highlight,
                    hasSelection,
                    false);
            });

        let circleSelection: Selection<DotPlotDataPoint> = dotGroupSelection
            .merge(newDotGroupSelection)
            .selectAll(DotPlot.CircleSelector.selectorName)
            .data((dataPoint: DotPlotDataGroup) => dataPoint.dataPoints);

        let newCircleSelection: Selection<DotPlotDataPoint> = circleSelection
            .enter()
            .append("circle")
            .classed(DotPlot.CircleSelector.className, true);

        circleSelection
            .merge(newCircleSelection)
            .attr("cy", (dataPoint: DotPlotDataPoint) => dataPoint.y)
            .attr("r", this.data.settings.dataPoint.radius)
            .attr("fill", this.colorHelper.isHighContrast ? this.colorHelper.getThemeColor() : this.settings.dataPoint.fill);

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
                columns: dotGroupSelection.merge(newDotGroupSelection),
                clearCatcher: this.clearCatcher,
                interactivityService: this.interactivityService,
                isHighContrastMode: this.colorHelper.isHighContrast
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
                    const y: number = (isEmpty(dataGroup.dataPoints)
                        ? this.data.dotsTotalHeight + this.data.settings.dataPoint.radius * DotPlot.RadiusFactor
                        : last(dataGroup.dataPoints).y) + this.data.labelFontSize;

                    return y - dataGroup.size.height;
                }
            },
            filter: (dataGroup: DotPlotDataGroup) => {
                return !!(dataGroup
                    && dataGroup.dataPoints
                    && this.layout.viewportIn.height
                    - this.data.maxXAxisHeight
                    + this.data.settings.dataPoint.radius * DotPlot.RadiusFactor > this.data.labelFontSize);
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

        this.svg
            .style("height", PixelConverter.toString(VisualLayout.MinViewportSize))
            .style("width", PixelConverter.toString(VisualLayout.MinViewportSize));
    }

    private renderTooltip(selection: Selection<DotPlotDataGroup>): void {
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
                tickWidth
            );
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

        const xAxis: Axis<any> =  this.xAxisProperties.axis.tickFormat(function(d) { return d.x; });

        this.xAxisSelection
            .call(xAxis)
            .selectAll(`g${DotPlot.TickTextSelector.selectorName}`)
            .style("fill", this.settings.categoryAxis.labelColor);

        if (this.colorHelper.isHighContrast) {
            this.xAxisSelection.selectAll("path")
                .style("stroke", this.settings.categoryAxis.labelColor);
            this.xAxisSelection.selectAll("line")
                .style("stroke", this.settings.categoryAxis.labelColor);
        }

        if (this.settings.categoryAxis.show) {
            this.xAxisSelection.selectAll(DotPlot.TickTextSelector.selectorName)
                .text((index: number) => {
                    return this.data.dataGroups[index]
                        && this.data.dataGroups[index].category.value;
                });
        } else {
            this.xAxisSelection.selectAll(DotPlot.TickTextSelector.selectorName)
                .append("title")
                .text((index: number) => {
                    return this.data.dataGroups[index]
                        && this.data.dataGroups[index].category.value;
                });
        }

        this.xAxisSelection
            .selectAll("line")
            .style("opacity", this.settings.categoryAxis.show
                ? DotPlot.MaxOpacity
                : DotPlot.MinOpacity);

        this.xAxisSelection
            .selectAll(DotPlot.XAxisLabelSelector.selectorName)
            .remove();

        if (this.settings.categoryAxis.showAxisTitle) {
            const titleWidth: number = textMeasurementService.measureSvgTextWidth(
                DotPlot.getCategoryTextProperties(this.data.categoryAxisName));
            this.xAxisSelection
                .append("text")
                .text(this.data.categoryAxisName)

                .style("text-anchor", DotPlot.TextAnchor)
                .style("fill", this.settings.categoryAxis.labelColor)

                .attr("class", DotPlot.XAxisLabelSelector.className)
                .attr("transform", translate(
                        this.dataViewport.width / DotPlot.XAxisSeparator - titleWidth / DotPlot.XAxisSeparator,
                        this.data.maxXAxisHeight - this.data.categoryLabelHeight + DotPlot.XAxisLabelOffset
                ));
        }
    }
}
