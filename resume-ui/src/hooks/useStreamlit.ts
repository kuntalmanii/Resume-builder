import { useState, useEffect } from 'react';
import { Streamlit } from 'streamlit-component-lib';

export interface StreamlitData {
  report?: any;
  markdown?: any;
  isGenerating?: boolean;
  isAnalyzing?: boolean;
  extractedText?: string;
  error?: string;
  theme?: string;
}

export const useStreamlit = () => {
  const [data, setData] = useState<StreamlitData>({});

  useEffect(() => {
    const onRender = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        const args = customEvent.detail.args;
        setData(args || {});
      }
    };

    Streamlit.events.addEventListener('render', onRender);
    Streamlit.setFrameHeight(); // Notify Streamlit of initial height

    // Automatically adjust height on window resize
    const handleResize = () => {
      Streamlit.setFrameHeight();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      Streamlit.events.removeEventListener('render', onRender);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Whenever data changes, we trigger height updates
  useEffect(() => {
    // Wait a brief tick for DOM to complete layout calculations
    const timer = setTimeout(() => {
      Streamlit.setFrameHeight();
    }, 100);
    return () => clearTimeout(timer);
  }, [data]);

  const sendToStreamlit = (value: any) => {
    Streamlit.setComponentValue(value);
  };

  return { data, sendToStreamlit };
};
