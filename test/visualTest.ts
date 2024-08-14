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

// <reference path="_references.ts"/>
import { last, uniq } from "lodash";
import powerbi from "powerbi-visuals-api";
import DataView = powerbi.DataView;

import { DotPlotData } from "./visualData";
import { DotPlotBuilder } from "./visualBuilder";

import { assertColorsMatch, ClickEventType } from "powerbi-visuals-utils-testutils";

import { isColorAppliedToElements, getSolidColorStructuralObject } from "./helpers/helpers";

describe("DotPlot", () => {
    let visualBuilder: DotPlotBuilder,
        defaultDataViewBuilder: DotPlotData,
        dataView: DataView;

    beforeEach(() => {
        visualBuilder = new DotPlotBuilder(1000, 500);
        defaultDataViewBuilder = new DotPlotData();
        dataView = defaultDataViewBuilder.getDataView();
    });

    describe("DOM tests", () => {
        it("svg element created", () => {
            expect(visualBuilder.mainElement).toBeDefined();
        });

        it("update", done => {
            visualBuilder.updateRenderTimeout(dataView, () => {
                const dotplotGroupLength: number = visualBuilder.dotGroups.length
                const tickLength: number = visualBuilder.xAxisTicks.length;

                expect(dotplotGroupLength).toBeGreaterThan(0);
                expect(tickLength).toBe(dataView.categorical!.categories![0].values.length);

                done();
            });
        });

        it("xAxis tick labels have tooltip", done => {
            defaultDataViewBuilder.valuesCategory = DotPlotData.ValuesCategoryLongNames;
            dataView = defaultDataViewBuilder.getDataView();

            visualBuilder.updateRenderTimeout(dataView, () => {

                visualBuilder.xAxisTickText.forEach((textElement: SVGTextElement, i: number) => {
                    expect(textElement).toBeDefined();
                    expect(textElement.textContent).toMatch(`${String(dataView.categorical!.categories![0].values[i])}|(Blank)`);
                });

                done();
            });
        });

        it("should correctly render duplicates in categories", done => {
            dataView.categorical!.categories![0].values[1] =
                dataView.categorical!.categories![0].values[0];

            dataView.categorical!.categories![0].identity![1] =
                dataView.categorical!.categories![0].identity![0];

            visualBuilder.updateRenderTimeout(dataView, () => {
                const groupsRects = Array.from(visualBuilder.dotGroups)
                    .map((element: SVGGElement) => element.getBoundingClientRect());

                expect(uniq(groupsRects.map(x => x.left)).length).toEqual(groupsRects.length);

                done();
            });
        });

        it("if visual shouldn't be rendered bottom scrollbar shouldn't be visible", () => {
            dataView = defaultDataViewBuilder.getDataView([DotPlotData.ColumnValues]);
            visualBuilder.update(dataView);
            expect(visualBuilder.mainElement.getBoundingClientRect().width).toBe(0);
        });

        it("multi-selection test", () => {
            visualBuilder.updateFlushAllD3Transitions(dataView);

            const firstGroup = visualBuilder.dotGroups[0];
            const secondGroup = visualBuilder.dotGroups[1];
            const thirdGroup = visualBuilder.dotGroups[2];

            firstGroup?.dispatchEvent(new MouseEvent("click"));
            secondGroup?.dispatchEvent(new MouseEvent("click", { ctrlKey: true}));

            expect(parseFloat(firstGroup.style.fillOpacity)).toBe(1);
            expect(parseFloat(secondGroup.style.fillOpacity)).toBe(1);
            expect(parseFloat(thirdGroup.style.fillOpacity)).toBeLessThan(1);
        });
    });

    describe("Format settings test", () => {
        describe("X-axis", () => {
            beforeEach(() => {
                dataView.metadata.objects = {
                    categoryAxis: {
                        show: true
                    }
                };
            });

            it("show", () => {
                (dataView.metadata.objects as any).categoryAxis.show = true;

                visualBuilder.updateFlushAllD3Transitions(dataView);

                visualBuilder.xAxisTicks
                    .forEach((e: SVGGElement) => {
                        const line = e.querySelector("line");
                        expect(line).toBeDefined();
                        expect(line!.style.opacity).not.toBe("0");
                    });

                visualBuilder.xAxisTicks
                    .map(e => e.querySelector("text")!)
                    .forEach((e: SVGTextElement) => {
                        expect(e.children.length).toBe(0);
                        expect(e.tagName).not.toBe("title");
                        expect(e.textContent!).toBeTruthy();
                    });

                (dataView.metadata.objects as any).categoryAxis.show = false;

                visualBuilder.updateFlushAllD3Transitions(dataView);

                visualBuilder.xAxisTicks
                    .forEach((element: SVGGElement) => {
                        const line = element.querySelector("line")!;
                        expect(line.style.opacity).toBe("0");
                    });

                visualBuilder.xAxisTicks
                    .map(e => e.querySelector("text")!)
                    .forEach(e => {
                        const title = e.querySelector("title");
                        expect(title).toBeDefined();
                        expect(title!.textContent).toBeTruthy();
                    });
            });

            it("title", () => {
                (dataView.metadata.objects as any).categoryAxis.showAxisTitle = true;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                expect(visualBuilder.xAxisLabel).toBeDefined();

                (dataView.metadata.objects as any).categoryAxis.showAxisTitle = false;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                expect(visualBuilder.xAxisLabel).toBeNull();
            });

            it("label color", () => {
                const color: string = "#112233";

                (dataView.metadata.objects as any).categoryAxis.showAxisTitle = true;
                (dataView.metadata.objects as any).categoryAxis.labelColor = getSolidColorStructuralObject(color);

                visualBuilder.updateFlushAllD3Transitions(dataView);

                visualBuilder.xAxisTicks
                    .forEach((element: SVGGElement) => {
                        assertColorsMatch(element.querySelector("text")!.style.fill, color);
                    });

                assertColorsMatch(visualBuilder.xAxisLabel!.style.fill, color);
            });
        });

        describe("Dots", () => {
            it("specified color should be applied to all of dots", () => {
                const color: string = "#112233";

                dataView.metadata.objects = {
                    dataPoint: {
                        fill: getSolidColorStructuralObject(color)
                    }
                };

                visualBuilder.updateFlushAllD3Transitions(dataView);

                visualBuilder.dots
                    .forEach((element: SVGCircleElement) => {
                        assertColorsMatch(element.style.fill, color);
                    });
            });

            it("specified radius should be applied to all of dots", () => {
                const radius: number = 5;

                dataView.metadata.objects = {
                    dataPoint: {
                        radius,
                    }
                };

                visualBuilder.updateFlushAllD3Transitions(dataView);

                visualBuilder.dots
                    .forEach((element: SVGCircleElement) => {
                        const parsedRadius: number = Number.parseInt(element.getAttribute("r") || '');

                        expect(parsedRadius).toBe(radius);
                    });
            });
        });

        describe("Data labels", () => {
            beforeEach(() => {
                dataView.metadata.objects = {
                    labels: {
                        show: true
                    }
                };
            });

            it("show", () => {
                (dataView.metadata.objects as any).labels.show = true;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                expect(visualBuilder.dataLabels.length).toBeGreaterThan(0);

                (dataView.metadata.objects as any).labels.show = false;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                expect(visualBuilder.dataLabels.length).toBe(0);
            });

            it("color", () => {
                let color: string = "#112233";

                (dataView.metadata.objects as any).labels.color = getSolidColorStructuralObject(color);
                visualBuilder.updateFlushAllD3Transitions(dataView);

                visualBuilder.dataLabels
                    .forEach((element: SVGTextElement) => {
                        assertColorsMatch(element.style.fill, color);
                    });
            });

            it("display units", () => {
                const displayUnits: number = 1000;

                (dataView.metadata.objects as any).labels.labelDisplayUnits = displayUnits;
                visualBuilder.updateFlushAllD3Transitions(dataView);

                visualBuilder.dataLabels
                    .forEach((element: SVGTextElement) => {
                        expect(last(element.textContent)).toEqual("K");
                    });
            });

            it("precision", () => {
                const precision: number = 7;

                (dataView.metadata.objects as any).labels.labelDisplayUnits = 1;
                (dataView.metadata.objects as any).labels.labelPrecision = precision;

                visualBuilder.updateFlushAllD3Transitions(dataView);

                visualBuilder.dataLabels
                    .forEach((element: SVGTextElement) => {
                        expect(element.textContent!.split(".")[1].length).toEqual(precision);
                    });
            });

            it("font size", () => {
                const fontSize: number = 23,
                    fontSizeInPt: string = "30.6667px";

                (dataView.metadata.objects as any).labels.fontSize = fontSize;

                visualBuilder.updateFlushAllD3Transitions(dataView);

                visualBuilder.dataLabels
                    .forEach((element: SVGTextElement) => {
                        expect(element.style.fontSize).toBe(fontSizeInPt);
                    });
            });
        });
    });

    describe("High contrast mode", () => {
        const backgroundColor: string = "#000000";
        const foregroundColor: string = "ff00ff";

        beforeEach(() => {
            visualBuilder.visualHost.colorPalette.isHighContrast = true;

            visualBuilder.visualHost.colorPalette.background = { value: backgroundColor };
            visualBuilder.visualHost.colorPalette.foreground = { value: foregroundColor };
        });

        it("should not use fill style", (done) => {
            visualBuilder.updateRenderTimeout(dataView, () => {
                expect(isColorAppliedToElements(visualBuilder.dots, undefined, "fill"));
                done();
            });
        });

        it("should use stroke style", (done) => {
            visualBuilder.updateRenderTimeout(dataView, () => {
                expect(isColorAppliedToElements(visualBuilder.dots, foregroundColor, "stroke"));
                done();
            });
        });
    });
});