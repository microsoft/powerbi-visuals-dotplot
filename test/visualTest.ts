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

/// <reference path="_references.ts"/>

namespace powerbi.extensibility.visual.test {
    // powerbi.extensibility.visual.test
    import DotPlotData = powerbi.extensibility.visual.test.DotPlotData;
    import DotPlotBuilder = powerbi.extensibility.visual.test.DotPlotBuilder;
    import getSolidColorStructuralObject = powerbi.extensibility.visual.test.helpers.getSolidColorStructuralObject;

    // powerbi.extensibility.utils.test
    import clickElement = powerbi.extensibility.utils.test.helpers.clickElement;
    import assertColorsMatch = powerbi.extensibility.utils.test.helpers.color.assertColorsMatch;

    // DotPlot1442374105856
    import VisualClass = powerbi.extensibility.visual.DotPlot1442374105856.DotPlot;
    import VisualSettings = powerbi.extensibility.visual.DotPlot1442374105856.DotPlotSettings;
    import DotPlotLabelsOrientation = powerbi.extensibility.visual.DotPlot1442374105856.DotPlotLabelsOrientation;

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
                expect(visualBuilder.mainElement[0]).toBeInDOM();
            });

            it("update", done => {
                visualBuilder.updateRenderTimeout(dataView, () => {
                    const dotplotGroupLength: number = visualBuilder.mainElement
                        .children(".dotplotSelector")
                        .children(".dotplotGroup")
                        .length;

                    const tickLength: number = visualBuilder.mainElement
                        .children(".axisGraphicsContext")
                        .children(".x.axis")
                        .children(".tick")
                        .length;

                    expect(dotplotGroupLength).toBeGreaterThan(0);
                    expect(tickLength).toBe(dataView.categorical.categories[0].values.length);

                    done();
                });
            });

            it("xAxis tick labels have tooltip", done => {
                defaultDataViewBuilder.valuesCategory = DotPlotData.ValuesCategoryLongNames;
                dataView = defaultDataViewBuilder.getDataView();

                visualBuilder.updateRenderTimeout(dataView, () => {
                    visualBuilder.xAxisTicks.each((i, e) =>
                        expect($(e).children("text").get(0).firstChild.textContent)
                            .toEqual(dataView.categorical.categories[0].values[i] || "(Blank)"));

                    done();
                });
            });

            it("should correctly render duplicates in categories", done => {
                dataView.categorical.categories[0].values[1] =
                    dataView.categorical.categories[0].values[0];

                dataView.categorical.categories[0].identity[1] =
                    dataView.categorical.categories[0].identity[0];

                visualBuilder.updateRenderTimeout(dataView, () => {
                    const groupsRects: ClientRect[] = visualBuilder.dotGroups
                        .toArray()
                        .map((element: Element) => element.getBoundingClientRect());

                    expect(_.uniq(groupsRects.map(x => x.left)).length).toEqual(groupsRects.length);

                    done();
                });
            });

            it("if visual shouldn't be rendered bottom scrollbar shouldn't be visible", () => {
                dataView = defaultDataViewBuilder.getDataView([DotPlotData.ColumnValues]);
                visualBuilder.update(dataView);
                expect(visualBuilder.mainElement[0].getBoundingClientRect().width).toBe(0);
            });

            it("multi-selection test", () => {
                visualBuilder.updateFlushAllD3Transitions(dataView);

                const firstGroup: JQuery = visualBuilder.dotGroups.eq(0),
                    secondGroup: JQuery = visualBuilder.dotGroups.eq(1),
                    thirdGroup: JQuery = visualBuilder.dotGroups.eq(2);

                clickElement(firstGroup);
                clickElement(secondGroup, true);

                expect(parseFloat(firstGroup.css("fill-opacity"))).toBe(1);
                expect(parseFloat(secondGroup.css("fill-opacity"))).toBe(1);
                expect(parseFloat(thirdGroup.css("fill-opacity"))).toBeLessThan(1);
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
                        .toArray()
                        .map($)
                        .forEach((e: JQuery) => {
                            expect(e.children("line").css("opacity")).not.toBe("0");
                        });

                    visualBuilder.xAxisTicks.toArray()
                        .map(e => $($(e).children("text")[0].childNodes[0]))
                        .forEach(e => {
                            expect(e.is("title")).toBeFalsy();
                            expect(e.text()).not.toBeEmpty();
                        });

                    (dataView.metadata.objects as any).categoryAxis.show = false;

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.xAxisTicks
                        .toArray()
                        .map($)
                        .forEach((element: JQuery) => {
                            expect(element.children("line").css("opacity")).toBe("0");
                        });

                    visualBuilder.xAxisTicks
                        .toArray()
                        .map(e => $($(e).children("text")[0].childNodes[0]))
                        .forEach(e => {
                            expect(e.is("title")).toBeTruthy();
                        });
                });

                it("title", () => {
                    (dataView.metadata.objects as any).categoryAxis.showAxisTitle = true;
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    expect(visualBuilder.xAxisLabel).toBeInDOM();

                    (dataView.metadata.objects as any).categoryAxis.showAxisTitle = false;
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    expect(visualBuilder.xAxisLabel).not.toBeInDOM();
                });

                it("lebel color", () => {
                    const color: string = "#112233";

                    (dataView.metadata.objects as any).categoryAxis.showAxisTitle = true;
                    (dataView.metadata.objects as any).categoryAxis.labelColor = getSolidColorStructuralObject(color);

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.xAxisTicks
                        .toArray()
                        .map($)
                        .forEach((element: JQuery) => {
                            assertColorsMatch(element.children("text").css("fill"), color);
                        });

                    assertColorsMatch(visualBuilder.xAxisLabel.css("fill"), color);
                });
            });

            describe("Data colors", () => {
                it("default color", () => {
                    const color: string = "#112233";

                    dataView.metadata.objects = {
                        dataPoint: {
                            fill: getSolidColorStructuralObject(color)
                        }
                    };

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.dots
                        .toArray()
                        .map($)
                        .forEach((element: JQuery) => {
                            assertColorsMatch(element.css("fill"), color);
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

                    expect(visualBuilder.dataLabels).toBeInDOM();

                    (dataView.metadata.objects as any).labels.show = false;
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    expect(visualBuilder.dataLabels).not.toBeInDOM();
                });

                it("color", () => {
                    let color: string = "#112233";

                    (dataView.metadata.objects as any).labels.color = getSolidColorStructuralObject(color);
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.dataLabels
                        .toArray()
                        .map($)
                        .forEach((element: JQuery) => {
                            assertColorsMatch(element.css("fill"), color);
                        });
                });

                it("display units", () => {
                    const displayUnits: number = 1000;

                    (dataView.metadata.objects as any).labels.labelDisplayUnits = displayUnits;
                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.dataLabels
                        .toArray()
                        .map($)
                        .forEach((element: JQuery) => {
                            expect(_.last(element.text())).toEqual("K");
                        });
                });

                it("precision", () => {
                    const precision: number = 7;

                    (dataView.metadata.objects as any).labels.labelDisplayUnits = 1;
                    (dataView.metadata.objects as any).labels.labelPrecision = precision;

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.dataLabels
                        .toArray()
                        .map($)
                        .forEach((element: JQuery) => {
                            expect(element.text().split(".")[1].length).toEqual(precision);
                        });
                });

                it("orientation", () => {
                    (dataView.metadata.objects as any).labels.orientation = DotPlotLabelsOrientation.Vertical;
                    visualBuilder.updateFlushAllD3Transitions(dataView);
                    visualBuilder.update(dataView);
                    expect(visualBuilder.getSettings().maxLabelWidth).toBe(0);
                });

                it("font size", () => {
                    const fontSize: number = 23,
                        fontSizeInPt: string = "30.6667px";

                    (dataView.metadata.objects as any).labels.fontSize = fontSize;

                    visualBuilder.updateFlushAllD3Transitions(dataView);

                    visualBuilder.dataLabels
                        .toArray()
                        .map($)
                        .forEach((element: JQuery) => {
                            expect(element.css("font-size")).toBe(fontSizeInPt);
                        });
                });
            });
        });

        describe("Capabilities tests", () => {
            it("all items having displayName should have displayNameKey property", () => {
                jasmine.getJSONFixtures().fixturesPath = "base";

                let jsonData = getJSONFixture("capabilities.json");

                let objectsChecker: Function = (obj) => {
                    for (let property in obj) {
                        let value: any = obj[property];

                        if (value.displayName) {
                            expect(value.displayNameKey).toBeDefined();
                        }

                        if (typeof value === "object") {
                            objectsChecker(value);
                        }
                    }
                };

                objectsChecker(jsonData);
            });
        });
    });
}
