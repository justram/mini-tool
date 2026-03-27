export const MINI_TOOLUI_EXAMPLE_EVENTS = {
  navigate: "mini-tool:navigate",
  audioMediaEvent: "mini-tool:audio-media-event",
  videoMediaEvent: "mini-tool:video-media-event",
  optionListAction: "mini-tool:option-list-action",
  approvalCardAction: "mini-tool:approval-card-action",
  dataTableSortChange: "mini-tool:data-table-sort-change",
  chartDataPointClick: "mini-tool:chart-data-point-click",
  instagramPostAction: "mini-tool:instagram-post-action",
  parameterSliderAction: "mini-tool:parameter-slider-action",
  preferencesPanelAction: "mini-tool:preferences-panel-action",
  messageDraftAction: "mini-tool:message-draft-action",
  imageGalleryClick: "mini-tool:image-gallery-click",
  itemCarouselItemClick: "mini-tool:item-carousel-item-click",
  itemCarouselAction: "mini-tool:item-carousel-action",
  questionFlowSelect: "mini-tool:question-flow-select",
  questionFlowComplete: "mini-tool:question-flow-complete",
} as const;

export type MiniToolUiExampleEventName = (typeof MINI_TOOLUI_EXAMPLE_EVENTS)[keyof typeof MINI_TOOLUI_EXAMPLE_EVENTS];
