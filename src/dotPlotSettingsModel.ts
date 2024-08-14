import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import { dataLabelUtils } from "powerbi-visuals-utils-chartutils";
import { DotPlotLabelsOrientation } from './dataInterfaces';

import IEnumMember = powerbi.IEnumMember;
import ValidatorType = powerbi.visuals.ValidatorType;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
import Card = formattingSettings.SimpleCard;
import Model = formattingSettings.Model

const orientationOptions: IEnumMember[] = [
    { value: DotPlotLabelsOrientation.Horizontal, displayName: "Visual_Horizontal" },
    { value: DotPlotLabelsOrientation.Vertical, displayName: "Visual_Vertical" },
];

class CategoryAxisSettingsCard extends Card {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Show",
        displayNameKey: "Visual_Show",
        value: true,
    });

    showAxisTitle = new formattingSettings.ToggleSwitch({
        name: "showAxisTitle",
        displayName: "Title",
        displayNameKey: "Visual_Title",
        description: "Title options",
        descriptionKey: "Visual_Description_Title",
        value: true,
    });

    labelColor = new formattingSettings.ColorPicker({
        name: "labelColor",
        displayName: "Label color",
        displayNameKey: "Visual_LabelColor",
        value: { value: dataLabelUtils.defaultLabelColor }
    });

    topLevelSlice = this.show;
    name = "categoryAxis";
    displayName = "X Axis";
    displayNameKey = "Visual_XAxis";
    slices = [this.showAxisTitle, this.labelColor];
}

class DataPointSettingsCard extends Card {
    fill = new formattingSettings.ColorPicker({
        name: "fill",
        displayName: "Fill",
        displayNameKey: "Visual_Fill",
        value: { value: "#00B8AA" }
    });

    radius = new formattingSettings.Slider({
        name: "radius",
        displayName: "Radius",
        displayNameKey: "Visual_Radius",
        value: 5,
        options: {
            minValue: { value: 1, type: ValidatorType.Min },
            maxValue: { value: 15, type: ValidatorType.Max },
        }
    });

    name = "dataPoint";
    displayName = "Dots";
    displayNameKey = "Visual_Dots";
    slices = [this.fill, this.radius];
}

class LabelsSettingsCard extends Card {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Show",
        displayNameKey: "Visual_Show",
        value: true,
    });

    color = new formattingSettings.ColorPicker({
        name: "color",
        displayName: "Color",
        displayNameKey: "Visual_Color",
        description: "Select color for data labels",
        descriptionKey: "Visual_Description_Color",
        value: { value: dataLabelUtils.defaultLabelColor }
    });

    labelDisplayUnits = new formattingSettings.AutoDropdown({
        name: "labelDisplayUnits",
        displayName: "Display units",
        displayNameKey: "Visual_DisplayUnits",
        description: "Select the units (millions, billions, etc.)",
        descriptionKey: "Visual_Description_DisplayUnits",
        value: 0,
    });

    labelPrecision = new formattingSettings.NumUpDown({
        name: "labelPrecision",
        displayName: "Decimal places",
        displayNameKey: "Visual_DecimalPlaces",
        description: "Select the number of decimal places to display",
        descriptionKey: "Visual_Description_DecimalPlaces",
        value: 2,
        options: {
            minValue: { value: 0, type: ValidatorType.Min },
            maxValue: { value: 17, type: ValidatorType.Max },
        }
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Text size",
        displayNameKey: "Visual_TextSize",
        value: dataLabelUtils.DefaultFontSizeInPt,
        options: {
            minValue: { value: 8, type: ValidatorType.Min },
            maxValue: { value: 60, type: ValidatorType.Max },
        }
    });

    orientation = new formattingSettings.ItemDropdown({
        name: "orientation",
        displayName: "Orientation",
        displayNameKey: "Visual_Orientation",
        items: orientationOptions,
        value: orientationOptions[0],
    });

    topLevelSlice = this.show;
    name = "labels";
    displayName = "Data labels";
    displayNameKey = "Visual_DataLabels";
    description = "Display data label options";
    descriptionKey = "Visual_Description_DataLabels";
    slices = [this.color, this.labelDisplayUnits, this.labelPrecision, this.fontSize, this.orientation];
}

export class DotPlotSettingsModel extends Model {
    categoryAxis = new CategoryAxisSettingsCard();
    dataPoint = new DataPointSettingsCard();
    labels = new LabelsSettingsCard();

    cards = [this.categoryAxis, this.dataPoint, this.labels];

    public setLocalizedOptions(localizationManager: ILocalizationManager) {
        this.setLocalizedDisplayName(orientationOptions, localizationManager);
    }

    private setLocalizedDisplayName(options: IEnumMember[], localizationManager: ILocalizationManager) {
        options.forEach(option => {
            option.displayName = localizationManager.getDisplayName(option.displayName.toString())
        });
    }

    public validateAndCorrectSettings(): void {
        this.dataPoint.radius.value = getValidNumberInRange(
            this.dataPoint.radius.value,
            this.dataPoint.radius.options.minValue.value,
            this.dataPoint.radius.options.maxValue.value
        );

        this.labels.labelPrecision.value = getValidNumberInRange(
            this.labels.labelPrecision.value,
            this.labels.labelPrecision.options.minValue.value,
            this.labels.labelPrecision.options.maxValue.value
        );
    }
}

function getValidNumberInRange(value: number, min: number, max: number) {
    if (value < min) {
        return min;
    } else if (value > max) {
        return max;
    }

    return value;
}