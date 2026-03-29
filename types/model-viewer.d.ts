import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        loading?: 'eager' | 'lazy' | 'auto';
        exposure?: string;
        'shadow-intensity'?: string;
        'camera-controls'?: boolean;
        'auto-rotate'?: boolean;
      };
    }
  }
}
