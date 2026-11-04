import React = require('react');
export namespace JSX {
  type Element = React.ReactElement;
  interface ElementChildrenAttribute { children: unknown }
  interface IntrinsicAttributes { key?: React.Key }
  type IntrinsicElements = { [K in keyof HTMLElementTagNameMap]: React.DOMProps<HTMLElementTagNameMap[K]> } & { [K in keyof SVGElementTagNameMap]: React.DOMProps<SVGElementTagNameMap[K]> };
}
export function jsx(...args: unknown[]): React.ReactElement;
export function jsxs(...args: unknown[]): React.ReactElement;
