import React from 'react';
import { PopupProvider } from '../contexts/PopupContext';
import { PopupHeader } from './layout/PopupHeader';
import { PopupContent } from './layout/PopupContent';
import { PopupFooter } from './layout/PopupFooter';

const PopupInner: React.FC = () => {
  return (
    <div className="w-96 h-[600px] bg-white flex flex-col shadow-lg">
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