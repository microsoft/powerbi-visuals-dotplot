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

import { interactivityBaseService } from "powerbi-visuals-utils-interactivityutils";
import ISelectionHandler = interactivityBaseService.ISelectionHandler;
import IInteractiveBehavior = interactivityBaseService.IInteractiveBehavior;
import IInteractivityService = interactivityBaseService.IInteractivityService;
import { IBehaviorOptions } from "powerbi-visuals-utils-interactivityutils/lib/interactivityBaseService";

export interface DotplotBehaviorOptions extends IBehaviorOptions<DotPlotDataGroup> {
    columns: Selection<any, DotPlotDataGroup, any, any>;
    clearCatcher: Selection<any, any, any, any>;
    interactivityService: IInteractivityService<DotPlotDataGroup>;
    isHighContrastMode: boolean;
}

export class DotplotBehavior implements IInteractiveBehavior {
    private columns: Selection<any, DotPlotDataGroup, any, any>;

    private clearCatcher: Selection<any, any, any, any>;
    private interactivityService: IInteractivityService<DotPlotDataGroup>;
    private isHighContrastMode: boolean;

    public bindEvents(
        options: DotplotBehaviorOptions,
        selectionHandler: ISelectionHandler): void {

        this.columns = options.columns;
        this.clearCatcher = options.clearCatcher;
        this.interactivityService = options.interactivityService;
        this.isHighContrastMode = options.isHighContrastMode;

        this.columns.on("click", (event: MouseEvent, dataPoint: DotPlotDataGroup) => {
            selectionHandler.handleSelection(dataPoint, event.ctrlKey || event.shiftKey || event.metaKey);
        });

        this.clearCatcher.on("click", () => {
            selectionHandler.handleClearSelection();
        });
    }

    public renderSelection(hasSelection: boolean): void {
        const hasHighlights: boolean = this.interactivityService.hasSelection();

        this.changeAttributeOpacity("fill-opacity", hasSelection, hasHighlights);

        if (this.isHighContrastMode) {
            this.changeAttributeOpacity("stroke-opacity", hasSelection, hasHighlights);
        }
    }

    private changeAttributeOpacity(attributeName: string, hasSelection: boolean, hasHighlights: boolean): void {
        this.columns.style(attributeName, (dataPoint: DotPlotDataGroup) => {
            return getOpacity(
                dataPoint.selected,
                dataPoint.highlight,
                !dataPoint.highlight && hasSelection,
                !dataPoint.selected && hasHighlights);
        });
    }
}
