/**
 * Shared output-widget library: public barrel.
 *
 * This library is theme-aware, presentational-only (no IPC calls, no store
 * reads), and independent of any Encore feature flag. It is the home for the
 * future enriched input/output component family - import widgets from here
 * (`components/widgets`) rather than reaching into the `output/` subfolder
 * directly. Every widget takes its data via props and renders deterministically.
 */

export type { WidgetProps, StatCardDatum, BarDatum, TimelineBucket, DonutSlice } from './types';

export { StatCard } from './output/StatCard';
export { StatCardGrid } from './output/StatCardGrid';
export { SectionCard } from './output/SectionCard';
export { ActivityTimeline } from './output/ActivityTimeline';
export { TypeBreakdown } from './output/TypeBreakdown';
export { AgentActivityBars } from './output/AgentActivityBars';
export { SuccessFailureWidget } from './output/SuccessFailureWidget';
