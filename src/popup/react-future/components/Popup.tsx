import React from 'react';
import { PopupProvider } from '../contexts/PopupContext';
import { PopupHeader } from './layout/PopupHeader';
import { PopupContent } from './layout/PopupContent';
import { PopupFooter } from './layout/PopupFooter';

const PopupInner: React.FC = () => {
  return (
    <div 
      className="bg-white flex flex-col shadow-lg"
      style={{
        width: '400px',
        height: '600px',
        minWidth: '400px',
        minHeight: '600px'
      }}
    >
      <PopupHeader />
      <PopupContent />
      <PopupFooter />
    </div>
  );
};

export const Popup: React.FC = () => {
  return (
    <PopupProvider>
      <PopupInner />
    </PopupProvider>
  );
};