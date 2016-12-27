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
    export enum DotPlotLabelsOrientation {
        Horizontal = <any>"Horizontal",
        Vertical = <any>"Vertical",
    };

    export interface DotPlotSelectors {
        scrollableContainer: ClassAndSelector;
        svgPlotSelector: ClassAndSelector;
        plotSelector: ClassAndSelector;
        plotGroupSelector: ClassAndSelector;
        axisSelector: ClassAndSelector;
        xAxisSelector: ClassAndSelector;
        circleSeletor: ClassAndSelector;
    }

    export interface DotPlotChartCategory {
        value: string;
        selectionId: SelectionId;
    }

    export interface DotPlotConstructorOptions {
        animator?: IGenericAnimator;
        svg?: D3.Selection;
        margin?: IMargin;
        radius?: number;
        strokeWidth?: number;
    }

    export interface DotPlotDataPoint {
        y: number;
        tooltipInfo: TooltipDataItem[];
    }

    export interface DotPlotDataGroup extends
        SelectableDataPoint,
        IDataLabelInfo {

        label: string;
        value: number;
        category: DotPlotChartCategory;
        color: string;
        tooltipInfo: TooltipDataItem[];
        dataPoints: DotPlotDataPoint[];
        highlight: boolean;
        index: number;
        labelFontSize: string;
    }

    export interface DotPlotData {
        dataGroups: DotPlotDataGroup[];
        settings: DotPlotSettings;
        categoryAxisName: string;
        maxXAxisHeight: number;
        categoryLabelHeight: number;
        categoryColumn: DataViewCategoryColumn;
        dotsTotalHeight: number;
        maxLabelWidth: number;
        labelFontSize: number;
        maxCategoryWidth: number;
    }
}
