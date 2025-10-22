
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

import { isEmpty } from "lodash/lang";
import { min, max } from "lodash/math";
import { last } from "lodash/array";

import powerbi from "powerbi-visuals-api";

import { VisualLayout } from "./layout";
import { DotplotBehavior, DotplotBehaviorOptions } from "./behavior";
import { DotPlotData, DotPlotChartCategory, DotPlotDataGroup, DotPlotDataPoint, DotPlotLabelsOrientation } from "./dataInterfaces";
import "../style/visual.less";

import IViewport = powerbi.IViewport;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import ITooltipService = powerbi.extensibility.ITooltipService;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import IColorPalette = powerbi.extensibility.IColorPalette;

import DataView = powerbi.DataView;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumn = powerbi.DataViewValueColumn;
import PrimitiveValue = powerbi.PrimitiveValue;

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

// d3
import { Axis as d3Axis } from "d3-axis";
import { Selection as d3Selection, select as d3Select } from "d3-selection";
import {
    ScaleLogarithmic as d3LogScale,
    ScaleLinear as d3LinearScale,
    ScaleOrdinal as d3OrdinalScale,
    scaleLinear as d3ScaleLinear,
    scaleLog as d3ScaleLog
} from "d3-scale";

// powerbi.visuals
import ISelectionId = powerbi.visuals.ISelectionId;

// powerbi-visuals-utils-formattingutils
import { valueFormatter, textMeasurementService } from "powerbi-visuals-utils-formattingutils";
import { TextProperties } from "powerbi-visuals-utils-formattingutils/lib/src/interfaces";
import IValueFormatter = valueFormatter.IValueFormatter;

// powerbi-visuals-utils-typeutils
import { pixelConverter as PixelConverter } from "powerbi-visuals-utils-typeutils";

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
import { ITooltipServiceWrapper, createTooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";

// powerbi-visuals-utils-colorutils
import { ColorHelper } from "powerbi-visuals-utils-colorutils";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { DotPlotSettingsModel } from './dotPlotSettingsModel';

const ValueText = "Visual_Value";

export function appendClearCatcher(selection: d3Selection<SVGSVGElement, unknown, HTMLDivElement, undefined>): d3Selection<SVGRectElement, unknown, HTMLDivElement, undefined> {
    return selection
        .append("rect")
        .classed("clearCatcher", true)
        .attr("width", "100%")
        .attr("height", "100%");
}

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

    public layout: VisualLayout;
    public name: string;
    public title: string;

    private events: IVisualEventService;
    private divContainer: d3Selection<HTMLDivElement, unknown, null, undefined>;
    private svg: d3Selection<SVGSVGElement, unknown, HTMLDivElement, undefined>;
    private xAxisSelection: d3Selection<SVGGElement, unknown, HTMLDivElement, unknown>;
    private dotPlot: d3Selection<SVGGElement, unknown, HTMLDivElement, undefined>;
    private clearCatcher: d3Selection<SVGRectElement, unknown, HTMLDivElement, undefined>;
    private behavior: DotplotBehavior;

    private colorPalette: IColorPalette;
    private colorHelper: ColorHelper;
    private durationAnimations: number = 0;

    private data: DotPlotData;
    private dataViewport: IViewport;
    private xAxisProperties: IAxisProperties;

    private scaleType: string = AxisScale.linear;

    private strokeWidth: number = 1;
    private static verticalLabelMarginRatio: number = 0.2;

    private visualHost: IVisualHost;

    private tooltipService: ITooltipService;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private selectionManager: ISelectionManager;
    private localizationManager: ILocalizationManager;
    private formattingSettingsService: FormattingSettingsService;
    private formattingSettings: DotPlotSettingsModel;

    private static DefaultValues = {
        labelOrientation: DotPlotLabelsOrientation.Horizontal
    };

    private getTooltipData(value: string): VisualTooltipDataItem[] {
        return [{
            displayName: this.localizationManager.getDisplayName(ValueText),
            value: value
        }];
    }

    public converter(
        dataView: DataView,
        height: number,
        layout: VisualLayout
    ): DotPlotData {
        if (!dataView
            || !dataView.categorical
            || isEmpty(dataView.categorical.values)
            || isEmpty(dataView.categorical.categories)) {
            return null;
        }

        const categoryColumn: DataViewCategoryColumn = dataView.categorical.categories[0],
            valueColumn: DataViewValueColumn = dataView.categorical.values[0],
            valueValues: number[] = valueColumn.values.map((value: PrimitiveValue) => {
                const convertedValue: number = Number(value);

                return convertedValue || DotPlot.DefaultValue;
            }) as number[];

        const minValue: number = min<number>(valueValues),
            maxValue: number = max<number>(valueValues);

        const valuesFormatter: IValueFormatter = valueFormatter.create({
            format: valueFormatter.getFormatStringByColumn(valueColumn.source),
            precision: this.formattingSettings.labels.labelPrecision.value,
            value: <number>this.formattingSettings.labels.labelDisplayUnits.value || maxValue
        });

        const formattedValues: string[] = valueValues.map(valuesFormatter.format);

        const categoriesFormatter: IValueFormatter = valueFormatter.create({
            format: valueFormatter.getFormatStringByColumn(categoryColumn.source)
        });

        const categories: DotPlotChartCategory[] = categoryColumn.values
            .map((value: PrimitiveValue, index: number) => {
                const selectionId: ISelectionId = this.visualHost
                    .createSelectionIdBuilder()
                    .withCategory(categoryColumn, index)
                    .createSelectionId();

                return {
                    selectionId,
                    value: categoriesFormatter.format(value)
                };
            });

        const labelFontSize: number = PixelConverter.fromPointToPixel(this.formattingSettings.labels.font.fontSize.value);

        const maxXAxisHeight: number =
            (this.formattingSettings.categoryAxis.show.value
                ? DotPlot.DefaultCategoryAxisHeight
                : DotPlot.MinCategoryAxisHeight)
            +
            (this.formattingSettings.categoryAxis.showAxisTitle.value
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

        const maxLabelHeight: number = this.formattingSettings.labels.orientation.value.value === DotPlotLabelsOrientation.Vertical
            ? maxLabelWidth
            : 0;

        const radius: number = this.formattingSettings.dataPoint.radius.value;

        const diameter: number = DotPlot.RadiusFactor * radius + DotPlot.ExtraDiameter;
        const dotsTotalHeight: number = height - maxXAxisHeight - radius * DotPlot.RadiusFactor - labelFontSize - layout.margin.top - maxLabelHeight;
        const maxDots: number = Math.floor(dotsTotalHeight / diameter);

        const yScale: d3LinearScale<number, number> = d3ScaleLinear()
            .domain([DotPlot.MinAmountOfDots, maxDots])
            .range([dotsTotalHeight, DotPlot.MinAmountOfDots]);

        const minDots = minValue / (maxValue / maxDots);
        const additionalValue = minValue <= 1 ? -minValue + 1 : 0; // negative values scales incorrect

        const dotScale: d3LogScale<number, number> = d3ScaleLog()
            .domain(DotPlot.getDomain(minValue + additionalValue, maxValue + additionalValue))
            .range(DotPlot.getDomain(minDots > maxDots ? 1 : minDots, maxDots))
            .clamp(true);

        const dataPointsGroup: DotPlotDataGroup[] = this.generateDotPlotDataGroup({ valueValues, dotScale, additionalValue, valueColumn, maxDots, yScale, categoryColumn, categories, formattedValues, labelFontSize });

        return {
            categoryColumn,
            settings: this.formattingSettings,
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

    private generateDotPlotDataGroup({
        valueValues,
        dotScale,
        additionalValue,
        valueColumn,
        maxDots,
        yScale,
        categoryColumn,
        categories,
        formattedValues,
        labelFontSize
    }: {
        valueValues: number[];
        dotScale: d3LogScale<number, number, never>;
        additionalValue: number;
        valueColumn: powerbi.DataViewValueColumn;
        maxDots: number;
        yScale: d3LinearScale<number, number, never>;
        categoryColumn: powerbi.DataViewCategoryColumn;
        categories: DotPlotChartCategory[];
        formattedValues: string[];
        labelFontSize: number;
    }) {
        const dataPointsGroup: DotPlotDataGroup[] = [];
        for (let index: number = 0, length: number = valueValues.length; index < length; index++) {
            const value: number = valueValues[index];
            const scaledValue: number = dotScale(value + additionalValue);
            const dataPoints: DotPlotDataPoint[] = [];
            const hasHighlight: boolean = valueColumn.highlights && valueColumn.highlights[index] != null;

            for (let level: number = 0; level < scaledValue && maxDots > DotPlot.MinAmountOfDots; level++) {
                dataPoints.push({
                    y: yScale(level),
                    tooltipInfo: this.getTooltipData(value
                        .toFixed(this.formattingSettings.labels.labelPrecision.value)
                        .toString())
                });
            }

            const categorySelectionId: ISelectionId = this.visualHost
                .createSelectionIdBuilder()
                .withCategory(categoryColumn, index)
                .createSelectionId();

            const tooltipInfo: VisualTooltipDataItem[] = this.getTooltipData(
                value.toFixed(this.formattingSettings.labels.labelPrecision.value));

            dataPointsGroup.push({
                value,
                dataPoints,
                tooltipInfo,
                color: this.formattingSettings.dataPoint.fill.value.value,
                category: categories[index],
                label: formattedValues[index],
                identity: categorySelectionId,
                selected: false,
                highlight: hasHighlight,
                index: dataPointsGroup.length,
                labelFontSize: PixelConverter.toString(labelFontSize)
            });
        }
        return dataPointsGroup;
    }

    private get hasHighlight(): boolean {
        const hasHighlight: boolean = this.data.dataGroups.some((dataGroup: DotPlotDataGroup) => dataGroup.highlight);
        return hasHighlight;
    }

    private static getDomain(min: number, max: number): number[] {
        const left: number = min < DotPlot.MinDomainValue
            ? DotPlot.DefaultDomainValue
            : min;

        return [left, max];
    }

    private setHighContrastMode(colorHelper: ColorHelper): void {
        this.formattingSettings.categoryAxis.labelColor.value.value = colorHelper.getHighContrastColor("foreground", this.formattingSettings.categoryAxis.labelColor.value.value);
        this.formattingSettings.dataPoint.fill.value.value = colorHelper.getHighContrastColor("foreground", this.formattingSettings.dataPoint.fill.value.value);
        this.formattingSettings.labels.color.value.value = colorHelper.getHighContrastColor("foreground", this.formattingSettings.labels.color.value.value);
    }

    public constructor(options: VisualConstructorOptions) {
        this.init(options);
    }

    private init(options: VisualConstructorOptions): void {
        this.events = options.host.eventService;


        this.visualHost = options.host as IVisualHost;

        this.tooltipService = this.visualHost.tooltipService;
        this.tooltipServiceWrapper = createTooltipServiceWrapper(
            this.visualHost.tooltipService,
            options.element);

        this.selectionManager = this.visualHost.createSelectionManager();
        this.localizationManager = this.visualHost.createLocalizationManager();
        this.formattingSettingsService = new FormattingSettingsService(this.localizationManager);

        this.behavior = new DotplotBehavior(this.selectionManager);

        this.colorPalette = this.visualHost.colorPalette;
        this.colorHelper = new ColorHelper(this.colorPalette);

        this.layout = new VisualLayout(null, DotPlot.Margin);

        this.divContainer = d3Select(options.element)
            .append("div")
            .classed(DotPlot.ScrollableContainerSelector.className, true);

        this.svg = this.divContainer
            .append("svg")
            .classed(DotPlot.SvgPlotSelector.className, true);

        this.clearCatcher = appendClearCatcher(this.svg);

        const axisGraphicsContext: d3Selection<SVGGElement, unknown, HTMLDivElement, undefined> = this.svg
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

            this.layout.viewport = options.viewport;

            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(DotPlotSettingsModel, dataView);
            this.formattingSettings.setLocalizedOptions(this.localizationManager);
            this.setHighContrastMode(this.colorHelper);

            const data: DotPlotData = this.converter(
                dataView,
                this.layout.viewportIn.height,
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
                    * (this.data.settings.dataPoint.radius.value * DotPlot.RadiusFactor + DotPlot.ExtraDiameterOfDataGroups)
                    + this.data.maxLabelWidth)
            };

            this.svg
                .style("height", PixelConverter.toString(this.dataViewport.height))
                .style("width", PixelConverter.toString(this.dataViewport.width));

            this.divContainer
                .style("width", PixelConverter.toString(this.layout.viewport.width))
                .style("height", PixelConverter.toString(this.layout.viewport.height));


            this.calculateAxes();

            this.renderAxis();

            const dotGroupSelection = this.drawDotPlot();

            const behaviorOptions: DotplotBehaviorOptions = {
                columns: dotGroupSelection,
                clearCatcher: this.clearCatcher,
                isHighContrastMode: this.colorHelper.isHighContrast,
                dataPoints: this.data.dataGroups,
                hasHighlights: this.hasHighlight,
                tooltipService: this.tooltipService,
                getTooltipInfo: (dataPoint: DotPlotDataGroup) => dataPoint.tooltipInfo,
            };
            this.behavior.bindEvents(behaviorOptions);

            if (this.formattingSettings.labels.show.value) {
                const layout: ILabelLayout = this.getDotPlotLabelsLayout();

                const labels: d3Selection<SVGTextElement, DotPlotDataGroup, SVGGElement, unknown> = dataLabelUtils.drawDefaultLabelsForDataPointChart(
                    this.data.dataGroups,
                    this.svg,
                    layout,
                    this.dataViewport,
                    false,
                    this.durationAnimations);

                if (labels) {
                    labels.attr("transform", (dataGroup: DotPlotDataGroup) => {
                        const size: ISize = dataGroup.size;
                        if (data.settings.labels.orientation.value.value === DotPlotLabelsOrientation.Vertical) {
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

                    labels
                        .style("font-family", this.formattingSettings.labels.font.fontFamily.value)
                        .style("font-style", this.formattingSettings.labels.font.italic.value ? "italic" : "normal")
                        .style("font-weight", this.formattingSettings.labels.font.bold.value ? "bold" : "normal")
                        .style("text-decoration", this.formattingSettings.labels.font.underline.value ? "underline" : "none");
                }
            }
            else {
                dataLabelUtils.cleanDataLabels(this.svg);
            }

            this.events.renderingFinished(options);
        } catch (e) {
            console.error(e);
            this.events.renderingFailed(options, e);
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }


    private drawDotPlot(): d3Selection<SVGGElement, DotPlotDataGroup, any, any> {
        const dotGroupSelection: d3Selection<any, DotPlotDataGroup, any, any> = this.dotPlot
            .selectAll(DotPlot.PlotGroupSelector.selectorName)
            .data(this.data.dataGroups);

        const newDotGroupSelection: d3Selection<SVGGElement, DotPlotDataGroup, any, any> = dotGroupSelection
            .enter()
            .append("g")
            .classed(DotPlot.PlotGroupSelector.className, true);

        dotGroupSelection
            .merge(newDotGroupSelection)
            .attr("focusable", true)
            .attr("tabindex", 0)
            .attr("transform", (dataPoint: DotPlotDataGroup) => {
                return translate(
                    this.getXDotPositionByIndex(dataPoint.index),
                    this.layout.margin.top + this.data.labelFontSize + this.data.maxLabelHeight);
                })
            .attr("stroke", (dataPoint: DotPlotDataGroup) => this.colorHelper.isHighContrast ? dataPoint.color : DotPlot.DotGroupStrokeColor)
            .attr("stroke-width", this.strokeWidth);

        const circleSelection: d3Selection<any, DotPlotDataPoint, any, any> = dotGroupSelection
            .merge(newDotGroupSelection)
            .selectAll(DotPlot.CircleSelector.selectorName)
            .data((dataPoint: DotPlotDataGroup) => dataPoint.dataPoints);

        const newCircleSelection: d3Selection<any, DotPlotDataPoint, any, any> = circleSelection
            .enter()
            .append("circle")
            .classed(DotPlot.CircleSelector.className, true);

        circleSelection
            .merge(newCircleSelection)
            .attr("cy", (dataPoint: DotPlotDataPoint) => dataPoint.y)
            .attr("r", this.data.settings.dataPoint.radius.value)
            .attr("fill", this.colorHelper.isHighContrast ? this.colorHelper.getThemeColor() : this.formattingSettings.dataPoint.fill.value.value);

        this.renderTooltip(dotGroupSelection.merge(newDotGroupSelection));

        circleSelection
            .exit()
            .remove();

        dotGroupSelection
            .exit()
            .remove();

        return dotGroupSelection.merge(newDotGroupSelection);
    }

    private getXDotPositionByIndex(index: number): number {
        const scale: d3OrdinalScale<number, number> = this.xAxisProperties.scale;

        return this.data.maxLabelWidth / DotPlot.MiddleLabelWidth + scale(index);
    }

    private getDotPlotLabelsLayout(): ILabelLayout {
        return {
            labelText: (dataGroup: DotPlotDataGroup) => {
                return dataLabelUtils.getLabelFormattedText({
                    label: dataGroup.label,
                    fontSize: this.formattingSettings.labels.font.fontSize.value,
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
                        ? this.data.dotsTotalHeight + this.data.settings.dataPoint.radius.value * DotPlot.RadiusFactor
                        : last(dataGroup.dataPoints).y) + this.data.labelFontSize;

                    return y - dataGroup.size.height;
                }
            },
            filter: (dataGroup: DotPlotDataGroup) => {
                return !!(dataGroup
                    && dataGroup.dataPoints
                    && this.layout.viewportIn.height
                    - this.data.maxXAxisHeight
                    + this.data.settings.dataPoint.radius.value * DotPlot.RadiusFactor > this.data.labelFontSize);
            },
            style: {
                "fill": this.formattingSettings.labels.color.value.value,
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

    private renderTooltip(selection: d3Selection<any, DotPlotDataGroup, any, any>): void {
        this.tooltipServiceWrapper.addTooltip(
            selection,
            (dataPoint: DotPlotDataGroup) => dataPoint.tooltipInfo,
            (dataPoint: DotPlotDataGroup) => dataPoint.identity);
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
            if (!this.formattingSettings.categoryAxis.show.value || !this.data.dataGroups[index]) {
                return DotPlot.DefaultTickValue;
            }

            const textProperties: TextProperties = DotPlot.getCategoryTextProperties(
                this.data.dataGroups[index].category.value);

            return textMeasurementService.getTailoredTextOrDefault(
                textProperties,
                tickWidth
            );
        });

        if (this.formattingSettings.categoryAxis.show.value) {
            // Should handle the label, units of the label and the axis style
            xAxisProperties.axisLabel = this.data.categoryAxisName;
        }

        this.xAxisProperties = xAxisProperties;
    }

    private renderAxis(): void {
        const height: number = this.dataViewport.height - this.data.maxXAxisHeight;

        this.xAxisSelection.attr(
            "transform",
            translate(
                this.data.maxLabelWidth / DotPlot.MiddleLabelWidth,
                height));

        const xAxis: d3Axis<any> =  this.xAxisProperties.axis.tickFormat(function(d) { return d.x; });

        this.xAxisSelection
            .call(xAxis)
            .selectAll(`g${DotPlot.TickTextSelector.selectorName}`)
            .style("fill", this.formattingSettings.categoryAxis.labelColor.value.value);

        if (this.colorHelper.isHighContrast) {
            this.xAxisSelection.selectAll("path")
                .style("stroke", this.formattingSettings.categoryAxis.labelColor.value.value);
            this.xAxisSelection.selectAll("line")
                .style("stroke", this.formattingSettings.categoryAxis.labelColor.value.value);
        }

        if (this.formattingSettings.categoryAxis.show.value) {
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
            .style("opacity", this.formattingSettings.categoryAxis.show.value
                ? DotPlot.MaxOpacity
                : DotPlot.MinOpacity);

        this.xAxisSelection
            .selectAll(DotPlot.XAxisLabelSelector.selectorName)
            .remove();

        if (this.formattingSettings.categoryAxis.showAxisTitle.value) {
            const titleWidth: number = textMeasurementService.measureSvgTextWidth(
                DotPlot.getCategoryTextProperties(this.data.categoryAxisName));
            this.xAxisSelection
                .append("text")
                .text(this.data.categoryAxisName)

                .style("text-anchor", DotPlot.TextAnchor)
                .style("fill", this.formattingSettings.categoryAxis.labelColor.value.value)

                .attr("class", DotPlot.XAxisLabelSelector.className)
                .attr("transform", translate(
                        this.dataViewport.width / DotPlot.XAxisSeparator - titleWidth / DotPlot.XAxisSeparator,
                        this.data.maxXAxisHeight - this.data.categoryLabelHeight + DotPlot.XAxisLabelOffset
                ));
        }
    }
}
