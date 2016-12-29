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

module powerbi.extensibility.visual.test {
    // powerbi.extensibility.utils.type
    import ValueType = powerbi.extensibility.utils.type.ValueType;

    // powerbi.extensibility.utils.test
    import getRandomNumbers = powerbi.extensibility.utils.test.helpers.getRandomNumbers;
    import TestDataViewBuilder = powerbi.extensibility.utils.test.dataViewBuilder.TestDataViewBuilder;

    export class DotPlotData extends TestDataViewBuilder {
        public static ColumnCategory: string = "Name";
        public static ColumnValues: string = "Value";

        public static ValuesCategoryLongNames: string[] = [
            "Sir Demetrius",
            "Sir Montgomery",
            "Sir Remington",
            "Sir Forrester",
            "Sir Christopher",
            "Miss Annabelle",
            "Miss Emmaline"
        ];

        public valuesCategory: string[] = [
            "William",
            "Olivia",
            "James",
            "Lucas",
            "Henry",
            "Aiden",
            "Daniel",
            "Harper",
            "Logan",
            "Ella",
        ];

        public valuesValue: number[] = getRandomNumbers(this.valuesCategory.length, 10, 100);

        public getDataView(columnNames?: string[]): powerbi.DataView {
            return this.createCategoricalDataViewBuilder([
                {
                    source: {
                        displayName: DotPlotData.ColumnCategory,
                        roles: { Category: true },
                        type: ValueType.fromDescriptor({ text: true })
                    },
                    values: this.valuesCategory
                }
            ], [
                    {
                        source: {
                            displayName: DotPlotData.ColumnValues,
                            isMeasure: true,
                            roles: { Value: true },
                            type: ValueType.fromDescriptor({ numeric: true }),
                        },
                        values: this.valuesValue
                    }
                ],
                columnNames).build();
        }
    }
}
