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

    public get mainElement(): SVGSVGElement {
        return this.element.querySelector("svg.dotplot")!;
    }

    public get labels(): SVGGElement | null {
        return this.mainElement.querySelector("g.labels") || null;
    }

    public get dataLabels(): SVGTextElement[] {
        const labels = this.labels;
        if (labels) {
            return Array.from(labels.querySelectorAll("text.data-labels"));
        }

        return [];
    }

    public get axisGraphicsContext(): SVGGElement {
        return this.mainElement.querySelector("g.axisGraphicsContext")!;
    }

    public get xAxis(): SVGGElement | null {
        return this.axisGraphicsContext.querySelector("g.x.axis");
    }

    public get xAxisLabel(): SVGTextElement | null {
        return this.xAxis?.querySelector("text.xAxisLabel") || null;
    }

    public get dotGroups(): NodeListOf<SVGGElement> {
        return this.mainElement
            .querySelector("g.dotplotSelector")!
            .querySelectorAll("g.dotplotGroup");
    }

    public get dots(): SVGCircleElement[] {
        const dots: SVGCircleElement[] = [];

        this.dotGroups.forEach((group) => {
            const dot = group.querySelector("circle.dot") as SVGCircleElement;

            if (dot) {
                dots.push(dot);
            }
        });

        return dots;
    }

    public get xAxisTicks(): SVGGElement[] {
        const xAxis = this.xAxis
        if (xAxis) {
            return Array.from(xAxis.querySelectorAll("g.tick"));
        }

        return [];
    }

    public get xAxisTickText(): SVGTextElement[] {
        const texts: SVGTextElement[] = [];

        this.xAxisTicks.forEach((tick) => {
            const text = tick.querySelector("text") as SVGTextElement;

            if (text) {
                texts.push(text);
            }
        });

        return texts;
    }
}
