import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Calendar, Hash, Printer, FilePdf } from '@phosphor-icons/react';
import html2pdf from 'html2pdf.js';
import './BulletPointsSheet.css';

const BulletPointsSheet = ({ isOpen, onClose, sheet, topic }) => {
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef(null);

  // Function to render text with bold and italic formatting
  const renderTextWithFormatting = (text) => {
    // First handle bold (**text**)
    let parts = text.split(/\*\*(.*?)\*\*/g);
    let result = [];
    
    parts.forEach((part, index) => {
      if (index % 2 === 1) {
        // This is bold text
        result.push(<strong key={`bold-${index}`}>{part}</strong>);
      } else {
        // Handle italic (*text*) in non-bold parts
        const italicParts = part.split(/\*(.*?)\*/g);
        italicParts.forEach((italicPart, italicIndex) => {
          if (italicIndex % 2 === 1) {
            result.push(<em key={`italic-${index}-${italicIndex}`}>{italicPart}</em>);
          } else if (italicPart) {
            result.push(italicPart);
          }
        });
      }
    });
    
    return result;
  };

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      handleClose();
    }
  };

  // Function to convert bullet points to HTML with proper formatting
  const convertBulletPointsToHTML = (bulletPoints) => {
    if (!bulletPoints) return '<p>No content available</p>';
    
    return bulletPoints.split('\n').map(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return '<br>';
      
      // Check if it's a heading (starts with # or is all caps)
      if (trimmedLine.startsWith('#') || (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 3 && !trimmedLine.startsWith('•'))) {
        const headingText = trimmedLine.replace(/^#+\s*/, '');
        return `<h3>${headingText}</h3>`;
      }
      
      // Check if it's a bullet point
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
        const content = trimmedLine.replace(/^[•\-*]\s*/, '');
        // Apply bold and italic formatting
        const formattedContent = content
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
        return `<div class="bullet-point">• ${formattedContent}</div>`;
      }
      
      // Regular text
      const formattedText = trimmedLine
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
      return `<p>${formattedText}</p>`;
    }).join('\n');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cheat Sheet: ${topic}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              color: #5050AA;
              border-bottom: 2px solid #5050AA;
              padding-bottom: 10px;
            }
            h3 {
              color: #5050AA;
              margin-top: 30px;
              margin-bottom: 15px;
              font-size: 1.2rem;
              font-weight: 600;
              border-bottom: 2px solid #5050AA;
              padding-bottom: 8px;
            }
            .bullet-point {
              margin: 8px 0;
              padding-left: 0;
            }
            p {
              margin: 12px 0;
            }
            .meta-info {
              color: #666;
              font-size: 14px;
              margin-bottom: 20px;
              background: #f8f9ff;
              padding: 12px;
              border-radius: 8px;
            }
            strong {
              color: #5050AA;
              font-weight: 600;
            }
            em {
              color: #6b7280;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <h1>Cheat Sheet: ${topic}</h1>
          <div class="meta-info">
            <p>📊 ${sheet?.questionsCount || 0} questions covered | 📅 Updated ${sheet?.lastUpdated ? new Date(sheet.lastUpdated).toLocaleDateString() : 'N/A'}</p>
          </div>
          ${convertBulletPointsToHTML(sheet?.bulletPoints)}
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };


  const handlePDFDownload = () => {
    // Create a temporary element with the formatted content
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        padding: 20px;
        max-width: 100%;
      ">
        <h1 style="
          color: #5050AA;
          border-bottom: 2px solid #5050AA;
          padding-bottom: 10px;
          margin-bottom: 20px;
        ">Cheat Sheet: ${topic}</h1>
        <div style="
          color: #666;
          font-size: 14px;
          margin-bottom: 20px;
          background: #f8f9ff;
          padding: 12px;
          border-radius: 8px;
        ">
          <p style="margin: 0;">📊 ${sheet?.questionsCount || 0} questions covered | 📅 Updated ${sheet?.lastUpdated ? new Date(sheet.lastUpdated).toLocaleDateString() : 'N/A'}</p>
        </div>
        ${convertBulletPointsToHTML(sheet?.bulletPoints).replace(/class="/g, 'style="').replace(/bullet-point"/g, 'margin: 8px 0; padding-left: 0;"').replace(/<h3>/g, '<h3 style="color: #5050AA; margin-top: 30px; margin-bottom: 15px; font-size: 1.2rem; font-weight: 600; border-bottom: 2px solid #5050AA; padding-bottom: 8px;">')}
      </div>
    `;

    const opt = {
      margin: 1,
      filename: `cheat-sheet-${topic.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className={`bullet-points-overlay ${!isClosing ? 'open' : ''}`} 
      onClick={handleOverlayClick}
    >
      <div className="bullet-points-modal" ref={modalRef}>
        <div className="bullet-points-header">
          <div className="bullet-points-title">
            <FileText size={24} className="sheet-icon" />
            <h2>Cheat Sheet: {topic}</h2>
          </div>
          <div className="header-actions">
            {sheet && sheet.bulletPoints && (
              <>
                <button 
                  className="action-button print-button" 
                  onClick={handlePrint}
                  title="Print cheat sheet"
                >
                  <Printer size={18} />
                </button>
                <button 
                  className="action-button pdf-button" 
                  onClick={handlePDFDownload}
                  title="Download PDF cheat sheet"
                >
                  <FilePdf size={18} />
                </button>
              </>
            )}
            <button 
              className="close-button" 
              onClick={handleClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {sheet ? (
          <>
            <div className="bullet-points-meta">
              <div className="meta-item">
                <Hash size={16} />
                <span>{sheet.questionsCount} questions covered</span>
              </div>
              <div className="meta-item">
                <Calendar size={16} />
                <span>Updated {new Date(sheet.lastUpdated).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="bullet-points-content">
              <div className="bullet-points-text">
                {sheet.bulletPoints.split('\n').map((line, index) => {
                  const trimmedLine = line.trim();
                  if (!trimmedLine) return <br key={index} />;
                  
                  // Check if it's a heading (starts with # or is all caps)
                  if (trimmedLine.startsWith('#') || (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 3 && !trimmedLine.startsWith('•'))) {
                    return (
                      <h3 key={index} className="bullet-points-heading">
                        {trimmedLine.replace(/^#+\s*/, '')}
                      </h3>
                    );
                  }
                  
                  // Check if it's a bullet point
                  if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
                    const content = trimmedLine.replace(/^[•\-*]\s*/, '');
                    return (
                      <div key={index} className="bullet-point">
                        {renderTextWithFormatting(content)}
                      </div>
                    );
                  }
                  
                  // Regular text
                  return (
                    <p key={index} className="bullet-points-paragraph">
                      {renderTextWithFormatting(trimmedLine)}
                    </p>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="bullet-points-empty">
            <FileText size={48} />
            <h3>No Cheat Sheet Available</h3>
            <p>Complete a quiz on this topic to generate your personalized cheat sheet!</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default BulletPointsSheet;
