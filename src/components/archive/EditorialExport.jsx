import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

function EditorialExport({ clips, category }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [anthologyTitle, setAnthologyTitle] = useState(`${category} Anthology`);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    const toastId = toast.loading('Assembling Anthology...');
    
    const printWindow = document.createElement('div');
    printWindow.style.width = '800px';
    printWindow.style.background = '#ffffff';
    printWindow.style.color = '#000000';
    printWindow.className = 'print-container font-serif';

    // --- PAGE 1: THE COVER ---
    const coverPage = document.createElement('div');
    coverPage.style.height = '1120px';
    coverPage.style.display = 'flex';
    coverPage.style.flexDirection = 'column';
    coverPage.style.justifyContent = 'center';
    coverPage.style.alignItems = 'center';
    coverPage.style.border = '20px solid #f8f8f8';
    coverPage.style.textAlign = 'center';
    coverPage.innerHTML = `
      <div style="border: 1px solid #000; padding: 60px 40px; width: 80%;">
        <p style="letter-spacing: 0.5em; text-transform: uppercase; font-size: 12px; margin-bottom: 40px;">Private Collection</p>
        <h1 style="font-size: 64px; text-transform: uppercase; letter-spacing: 15px; margin: 0; line-height: 1.1;">${anthologyTitle}</h1>
        <div style="width: 40px; height: 1px; background: #000; margin: 40px auto;"></div>
        <p style="font-style: italic; font-size: 20px;">Curated by Harshal Rana</p>
      </div>
    `;
    printWindow.appendChild(coverPage);

    // --- PAGE 2: TABLE OF CONTENTS ---
    const tocPage = document.createElement('div');
    tocPage.style.minHeight = '1120px';
    tocPage.style.padding = '100px 80px';
    tocPage.style.backgroundColor = '#ffffff';
    
    let tocListItems = clips.map((clip, index) => {
      const label = clip.type === 'image' 
        ? `Visual Study: ${clip.tags[0] || 'Untitled'}` 
        : clip.content.substring(0, 50) + '...';
      
      return `
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 15px; border-bottom: 1px dotted #ccc;">
          <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
            <span style="color: #b1976b; margin-right: 10px;">${String(index + 1).padStart(3, '0')}</span> 
            ${label}
          </span>
          <span style="font-size: 10px; font-style: italic;">Folio ${index + 1}</span>
        </div>
      `;
    }).join('');

    tocPage.innerHTML = `
      <h2 style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5em; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 50px;">Table of Contents</h2>
      <div style="column-count: 1;">
        ${tocListItems}
      </div>
    `;
    printWindow.appendChild(tocPage);

    // --- PAGE 3+: THE CONTENT ---
    const contentContainer = document.createElement('div');
    contentContainer.style.padding = '80px 60px';
    
    clips.forEach((clip, index) => {
      const entry = document.createElement('div');
      entry.style.marginBottom = '80px';
      entry.style.pageBreakInside = 'avoid';
      
      let visualContent = '';
      if (clip.type === 'text') {
        visualContent = `<blockquote style="font-size: 24px; line-height: 1.4; font-style: italic; border-left: 4px solid #b1976b; padding-left: 30px; margin: 30px 0;">"${clip.content}"</blockquote>`;
      } else if (clip.type === 'image') {
        visualContent = `<img src="${clip.content}" style="width: 100%; filter: grayscale(1) contrast(1.1); margin: 20px 0;" />`;
      } else {
        visualContent = `<div style="padding: 20px; border: 1px solid #000; font-family: sans-serif; font-size: 11px; margin: 20px 0;">URL: ${clip.content}</div>`;
      }

      entry.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 9px; text-transform: uppercase; letter-spacing: 0.3em; color: #999; margin-bottom: 15px;">
          <span>Folio No. ${String(index + 1).padStart(3, '0')}</span>
          <span>${new Date(clip.timestamp).toLocaleDateString()}</span>
        </div>
        ${visualContent}
        <div style="font-size: 10px; color: #b1976b; letter-spacing: 1px;">
          ${clip.tags.map(t => `#${t.toUpperCase()}`).join(' &nbsp; ')}
        </div>
      `;
      contentContainer.appendChild(entry);
    });
    printWindow.appendChild(contentContainer);

    // --- FINAL PAGE: THE COLOPHON ---
    const colophonPage = document.createElement('div');
    colophonPage.style.height = '1120px';
    colophonPage.style.padding = '100px 80px';
    colophonPage.style.display = 'flex';
    colophonPage.style.flexDirection = 'column';
    colophonPage.style.justifyContent = 'flex-end';
    colophonPage.style.textAlign = 'left';

    colophonPage.innerHTML = `
      <div style="max-width: 440px; border-top: 1px solid #000; padding-top: 40px; margin-bottom: 60px;">
        <h3 style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5em; margin-bottom: 25px;">Colophon</h3>
        <p style="font-size: 12px; line-height: 1.8; color: #666; margin-bottom: 40px;">
          This anthology was generated via the <strong>Ether Protocol</strong> on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. 
          The publication features typography set in <em>Playfair Display</em> and <em>Inter</em>. 
          Each fragment has been archived as a unique folio within the digital vault.
        </p>
        <div style="display: inline-block; border: 2px solid #b1976b; padding: 15px 25px; color: #b1976b;">
          <p style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.3em; margin: 0; font-weight: bold; line-height: 1.5;">
            STAMPED & VERIFIED<br/>
            CURATED IN GANDHINAGAR, INDIA
          </p>
        </div>
      </div>
    `;
    printWindow.appendChild(colophonPage);

    document.body.appendChild(printWindow);

    try {
      const canvas = await html2canvas(printWindow, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${anthologyTitle.replace(/\s+/g, '-')}-Edition.pdf`);
      
      toast.success('Folio Published', { id: toastId });
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Publication failed');
      console.error(error);
    } finally {
      document.body.removeChild(printWindow);
      setIsGenerating(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="text-[10px] tracking-[0.3em] uppercase font-bold text-magazine-accent border-b border-magazine-accent pb-1 hover:text-black dark:hover:text-white transition-all"
      >
        Publish Edition
      </button>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isGenerating && setIsModalOpen(false)}
              className="absolute inset-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 p-12 shadow-2xl"
            >
              <div className="text-center mb-12">
                <h2 className="font-serif italic text-4xl mb-2">Publish Folio</h2>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 italic">Assemble Archive, Index, & Colophon</p>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[9px] uppercase tracking-widest font-black text-magazine-accent block mb-2">Anthology Name</label>
                  <input 
                    type="text"
                    value={anthologyTitle}
                    onChange={(e) => setAnthologyTitle(e.target.value)}
                    className="w-full bg-transparent border-b border-gray-200 dark:border-gray-800 py-3 font-serif text-2xl focus:border-magazine-accent outline-none transition-colors"
                  />
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-sm border border-gray-100 dark:border-gray-800">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-4 italic">Folio Preview</p>
                  <div className="flex justify-between text-xs font-serif mb-2">
                    <span>Category:</span>
                    <span className="italic">{category}</span>
                  </div>
                  <div className="flex justify-between text-xs font-serif mb-2">
                    <span>Entries:</span>
                    <span>{clips.length}</span>
                  </div>
                  <div className="flex justify-between text-xs font-serif text-magazine-accent font-bold">
                    <span>Export Structure:</span>
                    <span>Full Anthology</span>
                  </div>
                </div>
              </div>

              <div className="mt-12 space-y-4">
                <button 
                  onClick={generatePDF}
                  disabled={isGenerating}
                  className="w-full bg-black dark:bg-white text-white dark:text-black py-4 text-[10px] uppercase tracking-[0.4em] font-black hover:opacity-80 transition-opacity disabled:opacity-30"
                >
                  {isGenerating ? 'Compiling Anthology...' : 'Confirm & Publish'}
                </button>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-full text-[9px] uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors py-2"
                >
                  Return to Vault
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default EditorialExport;