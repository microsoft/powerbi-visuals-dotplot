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
import * as d3 from "d3";

// NEW
import { getOpacity } from "./utils";
import { DotPlotDataGroup } from "./dataInterfaces";

// d3
// import Selection = d3.Selection;
import { Selection } from "d3-selection";

// powerbi.extensibility.utils.interactivity
import { interactivityService } from "powerbi-visuals-utils-interactivityutils";
// import ISelectionHandler = powerbi.extensibility.utils.interactivity.ISelectionHandler;
import ISelectionHandler = interactivityService.ISelectionHandler;
// import IInteractiveBehavior = powerbi.extensibility.utils.interactivity.IInteractiveBehavior;
import IInteractiveBehavior = interactivityService.IInteractiveBehavior; 
// import IInteractivityService = powerbi.extensibility.utils.interactivity.IInteractivityService;
import IInteractivityService = interactivityService.IInteractivityService;

export interface DotplotBehaviorOptions {
    // columns: Selection<DotPlotDataGroup, any, any, any>; //review any
    columns: Selection<any, any, any, any>; //TMP
    clearCatcher: Selection<any, any, any, any>; // review any
    interactivityService: IInteractivityService;
    isHighContrastMode: boolean;
}

export class DotplotBehavior implements IInteractiveBehavior {
    // private columns: Selection<DotPlotDataGroup, any, any, any>; // review any
    private columns: Selection<any, any, any, any>; //TMP

    private clearCatcher: Selection<any, any, any, any>; // review any
    private interactivityService: IInteractivityService;
    private isHighContrastMode: boolean;

    public bindEvents(
        options: DotplotBehaviorOptions,
        selectionHandler: ISelectionHandler): void {

        this.columns = options.columns;
        this.clearCatcher = options.clearCatcher;
        this.interactivityService = options.interactivityService;
        this.isHighContrastMode = options.isHighContrastMode;

        this.columns.on("click", (dataPoint: DotPlotDataGroup) => {
            console.warn("DBG this.columns.on(click)", dataPoint);
            // selectionHandler.handleSelection(
            //     dataPoint,
            //     (d3.event as MouseEvent).ctrlKey //d3.event not defined
            // );
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
