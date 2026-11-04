// A deliberately small stand-in for @types/react, only for offline checking.
export as namespace React;
export = React;
declare namespace React {
  type Key = string | number;
  type ReactNode = string | number | boolean | null | undefined | ReactElement | ReactNode[];
  interface ReactElement { type: unknown; props: unknown; key: string | null }
  interface CSSProperties { [key: string]: string | number | undefined }
  interface RefObject<T> { current: T }
  type Dispatch<A> = (value: A) => void;
  type SetStateAction<S> = S | ((prev: S) => S);
  function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
  function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  function useCallback<T extends (...args: never[]) => unknown>(callback: T, deps: readonly unknown[]): T;
  function useRef<T>(initial: T): RefObject<T>;
  function useRef<T>(initial: T | null): RefObject<T | null>;
  function useContext<T>(context: Context<T>): T;
  function useSyncExternalStore<T>(subscribe: (cb: () => void) => () => void, get: () => T): T;
  interface Context<T> { Provider: (props: { value: T; children?: ReactNode }) => ReactElement; __value?: T }
  function createContext<T>(value: T): Context<T>;
  function createElement(type: unknown, props?: unknown, ...children: unknown[]): ReactElement;

  interface SyntheticEvent<T = Element> { target: EventTarget; currentTarget: T; preventDefault(): void; stopPropagation(): void }
  interface FormEvent<T = Element> extends SyntheticEvent<T> {}
  interface ChangeEvent<T = Element> extends SyntheticEvent<T> { target: EventTarget & T }
  interface KeyboardEvent<T = Element> extends SyntheticEvent<T> { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }
  interface DragEvent<T = Element> extends SyntheticEvent<T> { dataTransfer: DataTransfer }
  interface PointerEvent<T = Element> extends SyntheticEvent<T> { clientX: number; clientY: number }
  interface MouseEvent<T = Element> extends SyntheticEvent<T> { clientX: number; clientY: number }

  interface DOMProps<T> {
    key?: Key; ref?: unknown; children?: ReactNode; className?: string; style?: CSSProperties; id?: string; title?: string; hidden?: boolean; role?: string; tabIndex?: number; draggable?: boolean;
    onClick?: (e: MouseEvent<T>) => void; onChange?: (e: ChangeEvent<T>) => void; onSubmit?: (e: FormEvent<T>) => void; onBlur?: (e: SyntheticEvent<T>) => void;
    onKeyDown?: (e: KeyboardEvent<T>) => void; onKeyUp?: (e: KeyboardEvent<T>) => void; onPointerUp?: (e: PointerEvent<T>) => void;
    onDragOver?: (e: DragEvent<T>) => void; onDragLeave?: (e: DragEvent<T>) => void; onDrop?: (e: DragEvent<T>) => void; onDragStart?: (e: DragEvent<T>) => void; onCancel?: (e: SyntheticEvent<T>) => void;
    [attribute: string]: unknown;
  }
}
declare global {
  namespace JSX {
    type Element = React.ReactElement;
    interface ElementChildrenAttribute { children: unknown }
    interface IntrinsicAttributes { key?: React.Key }
    type IntrinsicElements = { [K in keyof HTMLElementTagNameMap]: React.DOMProps<HTMLElementTagNameMap[K]> } & { [K in keyof SVGElementTagNameMap]: React.DOMProps<SVGElementTagNameMap[K]> };
  }
}
