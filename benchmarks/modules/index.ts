import { type BenchmarkComponent, benchmarkComponents } from "../component-registry";
import approvalCardModule from "./approval-card";
import audioModule from "./audio";
import chartModule from "./chart";
import citationModule from "./citation";
import citationListModule from "./citation-list";
import codeBlockModule from "./code-block";
import codeDiffModule from "./code-diff";
import dataTableModule from "./data-table";
import geoMapModule from "./geo-map";
import imageModule from "./image";
import imageGalleryModule from "./image-gallery";
import instagramPostModule from "./instagram-post";
import itemCarouselModule from "./item-carousel";
import linkPreviewModule from "./link-preview";
import linkedInPostModule from "./linkedin-post";
import messageDraftModule from "./message-draft";
import optionListModule from "./option-list";
import orderSummaryModule from "./order-summary";
import parameterSliderModule from "./parameter-slider";
import planModule from "./plan";
import preferencesPanelModule from "./preferences-panel";
import progressTrackerModule from "./progress-tracker";
import questionFlowModule from "./question-flow";
import type { BenchmarkModule } from "./shared";
import statsDisplayModule from "./stats-display";
import terminalModule from "./terminal";
import videoModule from "./video";
import xPostModule from "./x-post";

const benchmarkModuleByComponent: Record<BenchmarkComponent, BenchmarkModule> = {
  "approval-card": approvalCardModule,
  audio: audioModule,
  chart: chartModule,
  citation: citationModule,
  "citation-list": citationListModule,
  "code-block": codeBlockModule,
  "code-diff": codeDiffModule,
  "data-table": dataTableModule,
  image: imageModule,
  "image-gallery": imageGalleryModule,
  "geo-map": geoMapModule,
  "instagram-post": instagramPostModule,
  "item-carousel": itemCarouselModule,
  "link-preview": linkPreviewModule,
  "linkedin-post": linkedInPostModule,
  "message-draft": messageDraftModule,
  "option-list": optionListModule,
  "order-summary": orderSummaryModule,
  "parameter-slider": parameterSliderModule,
  plan: planModule,
  "preferences-panel": preferencesPanelModule,
  "progress-tracker": progressTrackerModule,
  "question-flow": questionFlowModule,
  "stats-display": statsDisplayModule,
  terminal: terminalModule,
  video: videoModule,
  "x-post": xPostModule,
};

export const benchmarkModules: BenchmarkModule[] = benchmarkComponents.map((component) => {
  const module = benchmarkModuleByComponent[component];

  if (module.component !== component) {
    throw new Error(`Module component mismatch for '${component}': got '${module.component}'.`);
  }

  return module;
});

export const benchmarkModuleComponents = benchmarkComponents.slice();
