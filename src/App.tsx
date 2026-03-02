import React, { useState } from 'react';
import { UploadArea } from './components/UploadArea';
import { ProductTable } from './components/ProductTable';
import { TemplateSelector } from './components/TemplateSelector';
import { LabelPreview } from './components/LabelPreview';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { parseXML, ProductItem } from './lib/xmlParser';
import { generatePDF, DEFAULT_TEMPLATES, LabelTemplate } from './lib/labelGenerator';
import { checkPrintedCodes, createPrintSession, recordPrintedCodes } from './lib/db';
import { Printer, FileDown, RefreshCw, AlertCircle, Database } from 'lucide-react';

function App() {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate>(DEFAULT_TEMPLATES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckingDb, setIsCheckingDb] = useState(false);

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setErrors([]);
    setItems([]);
    setSelectedIds(new Set());

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (text) {
        const result = parseXML(text);
        let parsedItems = result.items;
        
        // Check DB for printed codes
        setIsCheckingDb(true);
        try {
          const printedSet = await checkPrintedCodes(parsedItems);
          parsedItems = parsedItems.map(item => ({
            ...item,
            isPrinted: printedSet.has(item.fullCode)
          }));
        } catch (err) {
          console.error("DB Check failed", err);
          setErrors(prev => [...prev, "Failed to check printed status from database"]);
        } finally {
          setIsCheckingDb(false);
        }

        setItems(parsedItems);
        setErrors(prev => [...prev, ...result.errors]);
        
        // Select only NOT printed items by default
        const newIds = parsedItems
            .filter(i => !i.isPrinted)
            .map(i => i.id);
        
        setSelectedIds(new Set(newIds));
      }
      setIsProcessing(false);
    };
    reader.onerror = () => {
      setErrors(["Failed to read file"]);
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const getSelectedItems = () => {
    return items.filter(item => selectedIds.has(item.id));
  };

  const handleGeneratePDF = async () => {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
        alert("Please select at least one item");
        return;
    }
    setIsGenerating(true);
    try {
      // 1. Create Session
      const sessionId = await createPrintSession("PDF Download");
      
      // 2. Record Codes
      await recordPrintedCodes(selectedItems, sessionId);

      // 3. Generate PDF
      const pdf = await generatePDF(selectedItems, selectedTemplate);
      pdf.download(`labels-${new Date().toISOString().split('T')[0]}.pdf`);

      // 4. Update local state
      setItems(prev => prev.map(item => 
        selectedIds.has(item.id) ? { ...item, isPrinted: true } : item
      ));

    } catch (e) {
      console.error(e);
      alert("Error generating PDF or saving to DB");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
        alert("Please select at least one item");
        return;
    }
    setIsGenerating(true);
    try {
      // 1. Create Session
      const sessionId = await createPrintSession("Direct Print");

      // 2. Record Codes
      await recordPrintedCodes(selectedItems, sessionId);

      // 3. Print
      const pdf = await generatePDF(selectedItems, selectedTemplate);
      pdf.print();

      // 4. Update local state
      setItems(prev => prev.map(item => 
        selectedIds.has(item.id) ? { ...item, isPrinted: true } : item
      ));

    } catch (e) {
      console.error(e);
      alert("Error preparing print or saving to DB");
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setItems([]);
    setErrors([]);
    setSelectedIds(new Set());
  };

  const handleLoadSample = () => {
    const sampleXML = `
<File>
  <Dokument>
    <TablSchFakt>
      <SvedTov>
        <NaimTov>Men's Cotton T-Shirt Black L</NaimTov>
        <KolTov>1</KolTov>
        <NomSredIdentTov>
          <KIGTIN>04607000123456</KIGTIN>
          <KISer>A1B2C3D4</KISer>
        </NomSredIdentTov>
      </SvedTov>
      <SvedTov>
        <NaimTov>Women's Jeans Blue M</NaimTov>
        <KolTov>1</KolTov>
        <NomSredIdentTov>
          <KIZ>010460700065432121SERIAL123</KIZ>
        </NomSredIdentTov>
      </SvedTov>
       <SvedTov>
        <NaimTov>Running Shoes Sport X</NaimTov>
        <KolTov>1</KolTov>
        <NomSredIdentTov>
          <KIZ>010460700098765421RUN12345</KIZ>
        </NomSredIdentTov>
      </SvedTov>
    </TablSchFakt>
  </Dokument>
</File>`;
    
    setIsProcessing(true);
    setErrors([]);
    setItems([]);
    setSelectedIds(new Set());
    
    // Simulate delay
    setTimeout(() => {
        const result = parseXML(sampleXML);
        setItems(result.items);
        setErrors(result.errors);
        setSelectedIds(new Set(result.items.map(i => i.id)));
        setIsProcessing(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">LabelWizard</h1>
            <p className="text-slate-500">Honest Sign XML Parser & Label Generator</p>
          </div>
          <div className="flex gap-2">
            {items.length === 0 && (
                <Button variant="secondary" onClick={handleLoadSample}>
                    Load Sample Data
                </Button>
            )}
            {items.length > 0 && (
                <Button variant="outline" onClick={reset} className="gap-2">
                <RefreshCw size={16} />
                Start Over
                </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Input & Config */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Step 1: Upload */}
            <Card className={items.length > 0 ? "border-green-200 bg-green-50/30" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs">1</span>
                  Upload Data
                </CardTitle>
                <CardDescription>Import XML file from Honest Sign / EDI</CardDescription>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <UploadArea 
                    onFileSelect={handleFileSelect} 
                    isProcessing={isProcessing}
                    error={errors.length > 0 ? errors[0] : null}
                  />
                ) : (
                  <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-green-200">
                    <div>
                      <p className="font-medium text-green-900">File Processed Successfully</p>
                      <p className="text-sm text-green-700">
                        {items.length} items found 
                        {isCheckingDb ? (
                          <span className="ml-2 text-slate-500 animate-pulse">Checking database...</span>
                        ) : (
                          <span className="ml-2 text-slate-500">
                            ({items.filter(i => i.isPrinted).length} already printed)
                          </span>
                        )}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={reset} className="text-green-700 hover:text-green-900 hover:bg-green-100">
                      Change File
                    </Button>
                  </div>
                )}
                
                {errors.length > 0 && items.length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={18} />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Warnings during parsing:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {errors.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
                        {errors.length > 3 && <li>...and {errors.length - 3} more</li>}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Template Selection */}
            {items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs">2</span>
                    Select Template
                  </CardTitle>
                  <CardDescription>Choose label size and layout</CardDescription>
                </CardHeader>
                <CardContent>
                  <TemplateSelector 
                    selectedId={selectedTemplate.id} 
                    onSelect={setSelectedTemplate} 
                  />
                </CardContent>
              </Card>
            )}

            {/* Product List */}
            {items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductTable 
                    items={items} 
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Preview & Action */}
          <div className="lg:col-span-1 space-y-6">
            {items.length > 0 ? (
              <div className="sticky top-8 space-y-6">
                <Card className="border-slate-300 shadow-md">
                  <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                    <CardTitle className="text-lg">Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 flex justify-center bg-slate-100/50 min-h-[200px] items-center">
                    {items[0] && (
                      <LabelPreview item={items[0]} template={selectedTemplate} />
                    )}
                  </CardContent>
                  <div className="p-4 border-t border-slate-100 bg-white rounded-b-lg space-y-3">
                    <Button 
                      className="w-full gap-2" 
                      size="lg" 
                      onClick={handlePrint}
                      disabled={isGenerating || selectedIds.size === 0}
                    >
                      <Printer size={18} />
                      {isGenerating ? 'Processing...' : `Print ${selectedIds.size} Labels`}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2" 
                      onClick={handleGeneratePDF}
                      disabled={isGenerating || selectedIds.size === 0}
                    >
                      <FileDown size={18} />
                      Download PDF
                    </Button>
                    <p className="text-xs text-center text-slate-400 mt-2">
                      Total {selectedIds.size} labels selected
                    </p>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="hidden lg:block p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Printer size={24} className="opacity-50" />
                </div>
                <p>Upload a file to see preview and print options</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
