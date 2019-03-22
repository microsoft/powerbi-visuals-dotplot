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

import powerbi from "powerbi-visuals-api";

import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;

import { DotPlotSettings } from "./settings";

import ISelectionId = powerbi.visuals.ISelectionId;

import { interactivityService } from "powerbi-visuals-utils-interactivityutils";
import SelectableDataPoint = interactivityService.SelectableDataPoint;

import { dataLabelInterfaces } from "powerbi-visuals-utils-chartutils";
import IDataLabelInfo = dataLabelInterfaces.IDataLabelInfo;

export enum DotPlotLabelsOrientation {
    Horizontal = <any>"Horizontal",
    Vertical = <any>"Vertical",
}

export interface DotPlotChartCategory {
    value: string;
    selectionId: ISelectionId;
}

export interface DotPlotDataPoint {
    y: number;
    tooltipInfo: VisualTooltipDataItem[];
}

export interface DotPlotDataGroup extends
    SelectableDataPoint,
    IDataLabelInfo {
    label: string;
    value: number;
    category: DotPlotChartCategory;
    color: string;
    tooltipInfo: VisualTooltipDataItem[];
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
    maxLabelHeight: number;
    labelFontSize: number;
    maxCategoryWidth: number;
}

