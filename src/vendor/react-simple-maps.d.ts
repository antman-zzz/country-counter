declare module "*/react-simple-maps.js" {
  import * as React from 'react';

  export interface ComposableMapProps {
    projection?: any;
    projectionConfig?: any;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }
  export const ComposableMap: React.FC<ComposableMapProps>;

  export interface GeographiesProps {
    geography?: string | object | string[];
    children?: (data: { geographies: any[] }) => React.ReactNode;
  }
  export const Geographies: React.FC<GeographiesProps>;

  export interface GeographyProps {
    geography?: any;
    onClick?: (event: React.MouseEvent) => void;
    onMouseEnter?: (event: React.MouseEvent) => void;
    onMouseLeave?: (event: React.MouseEvent) => void;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
  }
  export const Geography: React.FC<GeographyProps>;

  export interface ZoomableGroupProps {
    center?: [number, number];
    zoom?: number;
    maxZoom?: number;
    minZoom?: number;
    onMoveStart?: (event: any, position: any) => void;
    onMoveEnd?: (event: any, position: any) => void;
    translateExtent?: [[number, number], [number, number]];
    children?: React.ReactNode;
  }
  export const ZoomableGroup: React.FC<ZoomableGroupProps>;

  export interface GraticuleProps {
    stroke?: string;
    strokeWidth?: number;
  }
  export const Graticule: React.FC<GraticuleProps>;

  export const Sphere: React.FC<any>;
}
