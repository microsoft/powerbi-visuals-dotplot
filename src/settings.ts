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

// module powerbi.extensibility.visual { //REVIEW

// powerbi.extensibility.utils.dataview
import { dataViewObjectsParser } from "powerbi-visuals-utils-dataviewutils";
//import DataViewObjectsParser = powerbi.extensibility.utils.dataview.DataViewObjectsParser;
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;

// powerbi.extensibility.utils.chart
// import dataLabelUtils = powerbi.extensibility.utils.chart.dataLabel.utils;
import { dataLabelUtils } from "powerbi-visuals-utils-chartutils";

import { DotPlotLabelsOrientation } from "./dataInterfaces";

export class CategoryAxisSettings {
    public show: boolean = true;
    public showAxisTitle: boolean = true;
    public labelColor: string = dataLabelUtils.defaultLabelColor;
}

export class DataPointSettings {
    private minRadius: number = 1;
    private maxRadius: number = 15;

    public fill: string = "#00B8AA";
    public radius: number = 5;

    public parse(): void {
        this.radius = Math.min(
            this.maxRadius,
            Math.max(this.minRadius, this.radius)
        );
    }
}

export class LabelsSettings {
    public static MinLabelPrecision: number = 0;
    public static MaxLabelPrecision: number = 17;

    public show: boolean = true;
    public color: string = dataLabelUtils.defaultLabelColor;
    public labelDisplayUnits: number = 0;
    public labelPrecision: number = 2;
    public fontSize: number = dataLabelUtils.DefaultFontSizeInPt;
    public orientation: DotPlotLabelsOrientation = DotPlotLabelsOrientation.Horizontal;

}

export class DotPlotSettings extends DataViewObjectsParser {
    public categoryAxis: CategoryAxisSettings = new CategoryAxisSettings();
    public dataPoint: DataPointSettings = new DataPointSettings();
    public labels: LabelsSettings = new LabelsSettings();
}
