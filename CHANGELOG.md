## 2.1.3.0
* Fixed X-axis category labels overlapping after the visual is resized
* Fixed the browser context menu appearing when right-clicking X-axis categories
* Removed an unused `tooltips` data role reference from capabilities
* Updated CI workflows (trigger on default branch, refreshed action versions, Node 20/22, npm cache, concurrency)
* Run Karma tests with `--no-sandbox` so the build passes on current Ubuntu runners
* Switched code scanning to GitHub's built-in (default) CodeQL setup and removed the custom CodeQL workflow — broader coverage (JavaScript/TypeScript and GitHub Actions) with no maintenance cost

## 2.1.2
* Fixed a bug where labels would vertically overlap dots if dot radius is >8px
* Fixed a bug where a lot of vertical labels disappeared randomly
* Made it so vertical chart labels take up less empty space
* Fixed a bug where long vertical labels reduced chart's width
* Fixed a bug where disabling labels would still leave space for them

## 2.1.1
### Code improvements
* Removed lodash
* Fixed audit issues
* Updated packages 
* Updated eslint config

## 2.1.0
### Visual changes
* Add report page tooltips
* Add keyboard navigation and context menu support
* Show tooltip on keyboard focus
* Enable the support multiple visual selection feature

### Code improvements
* Update API to 5.11.0, tools to 5.5.1 and other packages
* Migrate from tslint to eslint, from puppeteer to playwright-chromium
* Split d3 into submodules
* Remove jquery
* Migrate to new formatting pane
* Remove interactivity-utils
* Remove "coveralls" package

## 2.0.1
* Fixed bug with styles import

## 2.0.0
* Migrated to WebPack and D3 v5
* Updated packages

## 1.6.0
* API 2.1.0

## 1.5.0
* Implements high contrast mode
* API 1.13.0

## 1.4.0
* Added localization for all supported languages

## 1.2.1
* FIX: Fixed an issue that caused Dot Plot to stop working in IE 11

## 1.2.0
* UPD: powerbi-visuals-tools has been updated to 1.11.0 to support Bookmarks
* UPD: API has been updated to 1.11.0 to support Bookmarks
* UPD: powerbi-visuals-utils-interactivityutils has been updated to 3.1.0 to support Bookmarks
* UPD: powerbi-visuals-utils-testutils has been updated to "1.2.0" to support Bookmarks

## 1.1.2
* Fix for "X-Axis label displayes in the center of visual"

## 1.1.1
* Add an option to use vertical orientation of labels

## 1.1.0
* Updated packages
* Added localization
* Removed jQuery as dependencies

## 1.0.1
* Fixed negative value building while selection is applied to other visuals.