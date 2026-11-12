import type { NavigateFunction } from 'react-router'
export { cn } from "cn"

/** Go back inside the app, or to a parent page when this page was opened directly from a link. */
export const backOr = (nav: NavigateFunction, parent: string) =>
  (window.history.state?.idx ?? 0) > 0 ? nav(-1) : nav(parent)
