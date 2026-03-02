import React, { useState, useEffect } from 'react';
import { ProductItem } from '@/lib/xmlParser';
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface ProductTableProps {
  items: ProductItem[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({ items, selectedIds, onSelectionChange }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  if (items.length === 0) return null;

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, items.length);
  const currentItems = items.slice(startIndex, endIndex);

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(items.map(i => i.id)));
    }
  };

  const handleSelectPage = () => {
    const newSelected = new Set(selectedIds);
    const allPageSelected = currentItems.every(item => selectedIds.has(item.id));
    
    currentItems.forEach(item => {
      if (allPageSelected) {
        newSelected.delete(item.id);
      } else {
        newSelected.add(item.id);
      }
    });
    onSelectionChange(newSelected);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    onSelectionChange(newSelected);
  };

  return (
    <div className="rounded-md border border-slate-200 overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-4 justify-between items-center">
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedIds.size === items.length ? "Deselect All" : "Select All"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSelectPage}>
                {currentItems.every(i => selectedIds.has(i.id)) ? "Deselect Page" : "Select Page"}
            </Button>
        </div>
        <div className="text-sm text-slate-600">
            Selected: <span className="font-bold text-slate-900">{selectedIds.size}</span> / {items.length}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 w-10">
                <input 
                    type="checkbox" 
                    checked={currentItems.length > 0 && currentItems.every(i => selectedIds.has(i.id))}
                    onChange={handleSelectPage}
                    className="rounded border-slate-300"
                />
              </th>
              <th className="px-4 py-3">Product Name</th>
              <th className="px-4 py-3 w-32">GTIN</th>
              <th className="px-4 py-3 w-32">Serial</th>
              <th className="px-4 py-3 w-24 text-center">Status</th>
              <th className="px-4 py-3 w-24 text-center">Valid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentItems.map((item) => (
              <tr 
                key={item.id} 
                className={`hover:bg-slate-50/50 cursor-pointer ${selectedIds.has(item.id) ? 'bg-blue-50/50' : ''}`}
                onClick={() => toggleSelection(item.id)}
              >
                <td className="px-4 py-3">
                    <input 
                        type="checkbox" 
                        checked={selectedIds.has(item.id)}
                        onChange={() => {}} // Handled by row click
                        className="rounded border-slate-300"
                    />
                </td>
                <td className="px-4 py-3 font-medium text-slate-900 truncate max-w-[300px]" title={item.name}>
                  {item.name}
                </td>
                <td className="px-4 py-3 font-mono text-slate-600">{item.gtin || '-'}</td>
                <td className="px-4 py-3 font-mono text-slate-600 truncate max-w-[150px]" title={item.serial}>
                  {item.serial || '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  {item.isPrinted ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Printed
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      New
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {item.fullCode ? (
                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600">
                      <Check size={14} />
                    </div>
                  ) : (
                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600">
                      <X size={14} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between">
        <div className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
        </div>
        <div className="flex gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
                <ChevronLeft size={16} />
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
                <ChevronRight size={16} />
            </Button>
        </div>
      </div>
    </div>
  );
};
