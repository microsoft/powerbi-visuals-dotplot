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

// <reference path="_references.ts" />
import powerbi from "powerbi-visuals-api";

import { VisualBuilderBase } from "powerbi-visuals-utils-testutils";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;

import { DotPlot as VisualClass } from "../src/visual";

export class DotPlotBuilder extends VisualBuilderBase<VisualClass> {
    constructor(width: number, height: number) {
        super(width, height, "DotPlot1442374105856");
    }

    protected build(options: VisualConstructorOptions) {
        return new VisualClass(options);
    }

    public get mainElement() {
        return this.element.find("svg.dotplot");
    }

    public get dataLabels() {
        return this.mainElement
            .children("g.labels")
            .children("text.data-labels");
    }

    public get axisGraphicsContext() {
        return this.mainElement.children("g.axisGraphicsContext");
    }

    public get xAxis() {
        return this.axisGraphicsContext.children("g.x.axis");
    }

    public get xAxisLabel() {
        return this.xAxis.children("text.xAxisLabel");
    }

    public get dotGroups() {
        return this.mainElement
            .children("g.dotplotSelector")
            .children("g.dotplotGroup");
    }

    public get dots() {
        return this.dotGroups.children("circle.circleSelector");
    }

    public get xAxisTicks() {
        return this.xAxis.children("g.tick");
    }
}
