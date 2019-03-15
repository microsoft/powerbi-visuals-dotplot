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

import { clone } from "lodash/lang";
import { keys } from "lodash/object";

// powerbi.extensibility.utils.svg
//import IMargin = powerbi.extensibility.utils.svg.IMargin;
import { IMargin } from "powerbi-visuals-utils-svgutils";

import IViewport = powerbi.IViewport;

export class VisualLayout {

    public static MinViewportSize: number = 0;
    public static MinMarginSize: number = 0;

    private marginValue: IMargin;
    private viewportValue: IViewport;
    private viewportInValue: IViewport;
    private minViewportValue: IViewport;
    private originalViewportValue: IViewport;
    private previousOriginalViewportValue: IViewport;

    public defaultMargin: IMargin;
    public defaultViewport: IViewport;

    constructor(defaultViewport?: IViewport, defaultMargin?: IMargin) {
        this.defaultViewport = defaultViewport || VisualLayout.getDefaultViewport();
        this.defaultMargin = defaultMargin || VisualLayout.getDefaultMargin();
    }

    private static getDefaultViewport(): IViewport {
        return {
            height: VisualLayout.MinViewportSize,
            width: VisualLayout.MinViewportSize
        };
    }

    private static getDefaultMargin(): IMargin {
        return {
            top: VisualLayout.MinMarginSize,
            bottom: VisualLayout.MinMarginSize,
            right: VisualLayout.MinMarginSize,
            left: VisualLayout.MinMarginSize
        };
    }

    public get viewport(): IViewport {
        return this.viewportValue || (this.viewportValue = this.defaultViewport);
    }

    public get viewportCopy(): IViewport {
        return clone(this.viewport);
    }

    public get viewportIn(): IViewport {
        return this.viewportInValue || this.viewport;
    }

    public get minViewport(): IViewport {
        return this.minViewportValue || VisualLayout.getDefaultViewport();
    }

    public get margin(): IMargin {
        return this.marginValue || (this.marginValue = this.defaultMargin);
    }

    public set minViewport(value: IViewport) {
        this.setUpdateObject(
            value,
            (viewport: IViewport) => this.minViewportValue = viewport,
            VisualLayout.restrictToMinMax);
    }

    public set viewport(value: IViewport) {
        this.previousOriginalViewportValue = clone(this.originalViewportValue);
        this.originalViewportValue = clone(value);

        this.setUpdateObject(
            value,
            (viewport: IViewport) => this.viewportValue = viewport,
            (viewport: IViewport) => VisualLayout.restrictToMinMax(viewport, this.minViewport));
    }

    public set margin(value: IMargin) {
        this.setUpdateObject(
            value,
            (margin: IMargin) => this.marginValue = margin,
            VisualLayout.restrictToMinMax);
    }

    private update(): void {
        const width: number = this.viewport.width - (this.margin.left + this.margin.right),
            height: number = this.viewport.height - (this.margin.top + this.margin.bottom);

        this.viewportInValue = VisualLayout.restrictToMinMax(
            { width, height },
            this.minViewportValue);
    }

    private setUpdateObject<T>(object: T, setObjectFn: (T) => void, beforeUpdateFn?: (T) => void): void {
        object = clone(object);
        setObjectFn(VisualLayout.createNotifyChangedObject(object, () => {
            if (beforeUpdateFn) {
                beforeUpdateFn(object);
            }

            this.update();
        }));

        if (beforeUpdateFn) {
            beforeUpdateFn(object);
        }

        this.update();
    }

    private static createNotifyChangedObject<T>(object: T, objectChanged: (o?: T, key?: string) => void): T {
        const result: T = {} as T;

        keys(object).forEach((propertyName: string) => Object.defineProperty(result, propertyName, {
            get: () => object[propertyName],
            set: (value: any) => {
                object[propertyName] = value;
                objectChanged(object, propertyName);
            },
            enumerable: true,
            configurable: true
        }));

        return result;
    }

    private static restrictToMinMax<T>(value: T, minValue?: T): T {
        keys(value).forEach((propertyName: string) => {
            value[propertyName] = Math.max(
                minValue && minValue[propertyName] || VisualLayout.MinViewportSize,
                value[propertyName]);
        });

        return value;
    }
}
