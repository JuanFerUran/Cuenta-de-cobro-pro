import React, { useState } from 'react';
import { BrandingConfig } from '../types';

interface Props {
  config: BrandingConfig;
  onConfigChange: (config: BrandingConfig) => void;
}

const ConfigPanel: React.FC<Props> = ({ config, onConfigChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (field: keyof BrandingConfig, value: any) => {
    onConfigChange({ ...config, [field]: value });
  };

  return (
    <>
      {/* Botón Flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[300] w-14 h-14 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        title="Configuración"
      >
        <i className="fas fa-palette text-xl"></i>
      </button>

      {/* Modal */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[310]"
            onClick={() => setIsOpen(false)}
          ></div>

          <div className="fixed bottom-24 right-6 z-[320] w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <i className="fas fa-palette text-lg"></i>
                <h2 className="text-sm font-black uppercase tracking-wide">Personalización</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 rounded-lg p-1.5 transition"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Títulos */}
              <div className="space-y-3 pb-4 border-b border-slate-200">
                <h3 className="text-[10px] font-black text-slate-500 uppercase">Títulos del Documento</h3>
                <div>
                  <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">
                    Título Principal
                  </label>
                  <input
                    type="text"
                    value={config.documentTitle}
                    onChange={(e) => handleChange('documentTitle', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:border-blue-600 outline-none"
                    placeholder="Ej: Cuenta de"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">
                    Subtítulo
                  </label>
                  <input
                    type="text"
                    value={config.documentSubtitle}
                    onChange={(e) => handleChange('documentSubtitle', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:border-blue-600 outline-none"
                    placeholder="Ej: Cobro"
                  />
                </div>
              </div>

              {/* Colores */}
              <div className="space-y-3 pb-4 border-b border-slate-200">
                <h3 className="text-[10px] font-black text-slate-500 uppercase">Colores</h3>
                
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-600 uppercase block">
                    Color Primario
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) => handleChange('primaryColor', e.target.value)}
                      className="w-12 h-10 rounded-lg cursor-pointer border border-slate-200"
                    />
                    <input
                      type="text"
                      value={config.primaryColor}
                      onChange={(e) => handleChange('primaryColor', e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-600 uppercase block">
                    Color de Acento
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={config.accentColor}
                      onChange={(e) => handleChange('accentColor', e.target.value)}
                      className="w-12 h-10 rounded-lg cursor-pointer border border-slate-200"
                    />
                    <input
                      type="text"
                      value={config.accentColor}
                      onChange={(e) => handleChange('accentColor', e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-600 uppercase block">
                    Fondo del Logo
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={config.logoBackground}
                      onChange={(e) => handleChange('logoBackground', e.target.value)}
                      className="w-12 h-10 rounded-lg cursor-pointer border border-slate-200"
                    />
                    <input
                      type="text"
                      value={config.logoBackground}
                      onChange={(e) => handleChange('logoBackground', e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Logo */}
              <div className="space-y-3 pb-4 border-b border-slate-200">
                <h3 className="text-[10px] font-black text-slate-500 uppercase">Logo/Icono</h3>
                <div>
                  <label className="text-[9px] font-bold text-slate-600 uppercase block mb-2">
                    Subir Imagen PNG/JPG
                  </label>
                  <label className="flex items-center justify-center w-full px-4 py-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition">
                    <div className="text-center">
                      <i className="fas fa-cloud-upload-alt text-slate-400 text-lg mb-1 block"></i>
                      <span className="text-[9px] font-bold text-slate-600">Haz clic para subir</span>
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const result = event.target?.result as string;
                            handleChange('logoUrl', result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {config.logoUrl && (
                    <div className="mt-3 flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <img 
                        src={config.logoUrl} 
                        alt="Logo preview" 
                        className="max-w-[50px] max-h-[50px] object-contain"
                      />
                      <button
                        onClick={() => handleChange('logoUrl', 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><polyline points="14 2 14 8 20 8"/></svg>')}
                        className="text-[9px] font-bold text-red-600 hover:text-red-700 uppercase"
                      >
                        <i className="fas fa-trash mr-1"></i> Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Pie de Página */}
              <div className="space-y-3 pb-4 border-b border-slate-200">
                <h3 className="text-[10px] font-black text-slate-500 uppercase">Diseño del Documento</h3>
                <div>
                  <label className="text-[9px] font-bold text-slate-600 uppercase block mb-2">
                    Distribución de Contenido
                  </label>
                  <select
                    value={config.columnLayout}
                    onChange={(e) => handleChange('columnLayout', e.target.value as 'single' | 'double')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:border-blue-600 outline-none"
                  >
                    <option value="single">Una columna (Normal)</option>
                    <option value="double">Dos columnas (Libro)</option>
                  </select>
                </div>
              </div>

              {/* Posición del subtotal */}
              <div className="space-y-3 pb-4 border-b border-slate-200">
                <label className="text-[9px] font-bold text-slate-600 uppercase block">
                  Posición del Subtotal
                </label>
                <select
                  value={config.subtotalPosition}
                  onChange={(e) => handleChange('subtotalPosition', e.target.value as 'side' | 'bottom')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:border-blue-600 outline-none"
                >
                  <option value="side">Al lado (Compacto)</option>
                  <option value="bottom">Abajo (Para textos largos)</option>
                </select>
              </div>

              {/* Pie de Página */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-500 uppercase">Pie de Página</h3>
                <div>
                  <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">
                    Texto Final
                  </label>
                  <textarea
                    value={config.footerText}
                    onChange={(e) => handleChange('footerText', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-blue-600 outline-none resize-none h-16"
                    placeholder="Texto del pie de página..."
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ConfigPanel;
