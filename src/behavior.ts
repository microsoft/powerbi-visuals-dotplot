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

import { getOpacity } from "./utils";
import { DotPlotDataGroup } from "./dataInterfaces";

// d3
import { Selection } from "d3-selection";
import powerbi from "powerbi-visuals-api";
import ISelectionId = powerbi.visuals.ISelectionId;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import { LegendDataPoint } from "powerbi-visuals-utils-chartutils/lib/legend/legendInterfaces";

export interface BaseDataPoint {
    selected: boolean;
}

export interface SelectableDataPoint extends BaseDataPoint {
    identity: ISelectionId;
    specificIdentity?: ISelectionId;
}

export interface DotplotBehaviorOptions {
    dataPoints: DotPlotDataGroup[];
    columns: Selection<SVGGElement, DotPlotDataGroup, any, any>;
    clearCatcher: Selection<any, any, any, any>;
    isHighContrastMode: boolean;
    hasHighlights: boolean;
}

export class DotplotBehavior {
    private selectionManager: ISelectionManager;
    private options: DotplotBehaviorOptions;

    constructor(selectionManager: ISelectionManager) {
        this.selectionManager = selectionManager;
        this.selectionManager.registerOnSelectCallback(this.onSelectCallback.bind(this));
    }

    public get hasSelection(): boolean {
        return this.selectionManager.hasSelection();
    }

    public get isInitialized(): boolean {
        return !!this.options;
    }

    public bindEvents(options: DotplotBehaviorOptions): void {
        this.options = options;

        this.bindClickEvents();
        this.bindContextMenuEvents();
        this.bindKeyboardEvents();

        this.onSelectCallback();
    }

    private bindClickEvents(): void {
        this.options.columns.on("click", (event: MouseEvent, dataPoint: DotPlotDataGroup) => {
            event.stopPropagation();
            this.selectDataPoint(dataPoint, event.ctrlKey || event.shiftKey || event.metaKey);
            this.onSelectCallback();
        });

        this.options.clearCatcher.on("click", () => {
            this.selectionManager.clear();
            this.onSelectCallback();
        });
    }

    private bindContextMenuEvents(): void {
        this.options.columns.on("contextmenu", (event: MouseEvent, dataPoint: DotPlotDataGroup) => {
            event.preventDefault();
            event.stopPropagation();
            this.selectionManager.showContextMenu(dataPoint.identity, {
                x: event.clientX,
                y: event.clientY
            });
        });

        this.options.clearCatcher.on("contextmenu", (event: MouseEvent) => {
            event.preventDefault();
            const emptySelection = {
                "measures": [],
                "dataMap": {
                }
            };
            this.selectionManager.showContextMenu(emptySelection, {
                x: event.clientX,
                y: event.clientY
            });
        });
    }

    private bindKeyboardEvents(): void {
        this.options.columns.on("keydown", (event: KeyboardEvent, dataPoint: DotPlotDataGroup) => {
            if (event.code === "Enter" || event.code === "Space") {
                event.preventDefault();
                event.stopPropagation();
                this.selectDataPoint(dataPoint, event.ctrlKey || event.shiftKey || event.metaKey);
                this.onSelectCallback();
            }
        });
    }

    private onSelectCallback(selectionIds?: ISelectionId[]): void {
        const selectedIds: ISelectionId[] = selectionIds || <ISelectionId[]>this.selectionManager.getSelectionIds();
        this.setSelectedToDataPoints(this.options.dataPoints, selectedIds);
        this.renderSelection();
    }

    private setSelectedToDataPoints(dataPoints: SelectableDataPoint[] | LegendDataPoint[], ids?: ISelectionId[], hasHighlightsParameter?: boolean): void {
        const hasHighlights: boolean = hasHighlightsParameter || (this.options && this.options.hasHighlights);
        const selectedIds: ISelectionId[] = ids || <ISelectionId[]>this.selectionManager.getSelectionIds();

        if (hasHighlights && this.hasSelection) {
            this.selectionManager.clear();
        }

        for (const dataPoint of dataPoints) { 
            dataPoint.selected = this.isDataPointSelected(dataPoint, selectedIds);
        }
    }

    private selectDataPoint(dataPoint: SelectableDataPoint, multiSelect: boolean = false): void {
        if (!dataPoint?.identity) return;

        const selectedIds: ISelectionId[] = <ISelectionId[]>this.selectionManager.getSelectionIds();
        const isSelected: boolean = this.isDataPointSelected(dataPoint, selectedIds);

        const selectionIdsToSelect: ISelectionId[] = [];
        if (!isSelected) {
            dataPoint.selected = true;
            selectionIdsToSelect.push(dataPoint.identity);
        } else {
            // toggle selected back to false
            dataPoint.selected = false;
            if (multiSelect) {
                selectionIdsToSelect.push(dataPoint.identity);
            }
        }

        if (selectionIdsToSelect.length > 0) {
            this.selectionManager.select(selectionIdsToSelect, multiSelect);
        } else {
            this.selectionManager.clear();
        }
    }

    private isDataPointSelected(dataPoint: SelectableDataPoint | LegendDataPoint, selectedIds: ISelectionId[]): boolean {
        return selectedIds.some((value: ISelectionId) => value.equals(<ISelectionId>dataPoint.identity));
    }

    private renderSelection(): void {
        const hasSelection: boolean = this.hasSelection;
        const hasHighlights: boolean = this.options.hasHighlights;

        this.changeAttributeOpacity("fill-opacity", hasSelection, hasHighlights);

        if (this.options.isHighContrastMode) {
            this.changeAttributeOpacity("stroke-opacity", hasSelection, hasHighlights);
        }
    }

    private changeAttributeOpacity(attributeName: string, hasSelection: boolean, hasHighlights: boolean): void {
        this.options.columns.style(attributeName, (dataPoint: DotPlotDataGroup) => {
            return getOpacity(
                dataPoint.selected,
                dataPoint.highlight,
                !dataPoint.highlight && hasSelection,
                !dataPoint.selected && hasHighlights);
        });
    }
}
