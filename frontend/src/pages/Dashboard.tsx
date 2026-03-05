/**
 * Dashboard Page - Main entry point for GanZhi Stock Dashboard
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { KLineChart } from '@/components/KLineChart';
import { MonthlyKLineChart } from '@/components/MonthlyKLineChart';
import { FiveElementsAdvice } from '@/components/FiveElementsAdvice';
import { fetchStockData, importStockData, clearStockData, type StockData } from '@/config/supabase';
import { parseExcelFile, validateStockData, type ParsedStockData } from '@/utils/excelParser';

const Dashboard: React.FC = () => {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Annotation state
  const [annotatedIndices, setAnnotatedIndices] = useState<number[]>([]);
  
  // Date range filter
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Stats
  const [stats, setStats] = useState<{
    totalRecords: number;
    dateRange: string;
    latestPrice: number;
    priceChange: number;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data on mount
  useEffect(() => {
    loadStockData();
  }, []);

  const loadStockData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching stock data from Supabase...');
      const data = await fetchStockData({});
      console.log('Fetched data:', data.length, 'records');
      
      if (data.length > 0) {
        console.log('First record:', data[0]);
        console.log('Last record:', data[data.length - 1]);
        setStockData(data);
        
        // Calculate stats
        const latest = data[data.length - 1];
        const previous = data.length > 1 ? data[data.length - 2] : latest;
        const priceChange = ((latest.close - previous.close) / previous.close * 100).toFixed(2);
        
        setStats({
          totalRecords: data.length,
          dateRange: `${data[0].trade_date} ~ ${latest.trade_date}`,
          latestPrice: latest.close,
          priceChange: parseFloat(priceChange),
        });
        
        // Set default date range
        if (!startDate && !endDate) {
          setStartDate(data[0].trade_date);
          setEndDate(latest.trade_date);
        }
      } else {
        setStockData([]);
        setStats(null);
      }
    } catch (err) {
      console.error('Error loading stock data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };


  // Annotation handlers
  const handleAnnotate = (index: number) => {
    setAnnotatedIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleClearAnnotations = () => {
    setAnnotatedIndices([]);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file extension
    const validExtensions = ['.xlsx', '.xls'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setError('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress('Parsing Excel file...');

    try {
      // Step 1: Parse Excel
      const parsedData: ParsedStockData[] = await parseExcelFile(file);
      setUploadProgress(`Parsed ${parsedData.length} rows, validating...`);

      if (parsedData.length === 0) {
        throw new Error('No valid data found in Excel file');
      }

      // Step 2: Validate data
      const validation = validateStockData(parsedData);
      if (!validation.valid) {
        console.warn('Validation warnings:', validation.errors);
      }

      // Step 3: Import to database
      setUploadProgress(`Importing ${parsedData.length} records to database...`);
      const importResult = await importStockData(parsedData as StockData[]);

      if (importResult.success) {
        setUploadProgress(`Successfully imported ${importResult.imported} records!`);
        // Reload data
        await loadStockData();
      } else {
        throw new Error(importResult.errors.join('; '));
      }

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(''), 3000);
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all stock data? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const result = await clearStockData();
      if (result.success) {
        setStockData([]);
        setStats(null);
        setStartDate('');
        setEndDate('');
        alert(`Successfully deleted ${result.deleted} records`);
      } else {
        throw new Error('Failed to clear data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeApply = async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchStockData({ 
        startDate, 
        endDate 
      });
      
      setStockData(data);
      
      if (data.length > 0) {
        const latest = data[data.length - 1];
        const previous = data.length > 1 ? data[data.length - 2] : latest;
        const priceChange = ((latest.close - previous.close) / previous.close * 100).toFixed(2);
        
        setStats({
          totalRecords: data.length,
          dateRange: `${data[0].trade_date} ~ ${latest.trade_date}`,
          latestPrice: latest.close,
          priceChange: parseFloat(priceChange),
        });
      } else {
        setStats(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to filter data');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilter = async () => {
    setStartDate('');
    setEndDate('');
    await loadStockData();
  };

  // Filter data by date range
  const filteredData = useMemo(() => {
    if (!startDate || !endDate) return stockData;
    
    return stockData.filter(d => {
      const date = new Date(d.trade_date);
      return date >= new Date(startDate) && date <= new Date(endDate);
    });
  }, [stockData, startDate, endDate]);

  return (
    <div className="min-h-screen bg-fin-bg text-text-primary flex flex-col">
      {/* Header */}
      <header className="border-b border-fin-border bg-fin-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gold">
                大师版天干地支股票看板
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                上证指数历史K线 · 融合公历与天干地支·作者黄浦城Github:paxon_huang
              </p>
            </div>
            
            {/* Stats */}
            {stats && (
              <div className="flex items-center gap-6 flex-wrap">
                <div className="text-right">
                  <div className="text-xs text-text-secondary">最新价</div>
                  <div className="text-xl font-bold text-gold-light">
                    {stats.latestPrice.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-text-secondary">涨跌幅</div>
                  <div className={`text-xl font-bold ${stats.priceChange >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {stats.priceChange >= 0 ? '+' : ''}{stats.priceChange}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-text-secondary">数据量</div>
                  <div className="text-sm">
                    {stats.totalRecords} 条
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="border-b border-fin-border bg-fin-card/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Date Range Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-text-secondary text-sm">日期范围:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 bg-fin-bg border border-fin-border rounded text-sm text-text-primary focus:outline-none focus:border-gold"
              />
              <span className="text-text-secondary">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 bg-fin-bg border border-fin-border rounded text-sm text-text-primary focus:outline-none focus:border-gold"
              />
              <button
                onClick={handleDateRangeApply}
                disabled={loading || !startDate || !endDate}
                className="px-4 py-1.5 bg-gold/20 text-gold border border-gold/50 rounded text-sm hover:bg-gold/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                应用
              </button>
              <button
                onClick={handleResetFilter}
                disabled={loading || (!startDate && !endDate)}
                className="px-4 py-1.5 bg-fin-bg border border-fin-border rounded text-sm text-text-secondary hover:text-text-primary hover:border-text-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                重置
              </button>
            </div>

            {/* Upload Buttons */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-1.5 bg-gold text-fin-bg font-medium rounded text-sm hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? '上传中...' : '导入Excel'}
              </button>
              <button
                onClick={handleClearData}
                disabled={loading || stockData.length === 0}
                className="px-4 py-1.5 bg-red-900/30 text-red-400 border border-red-700/50 rounded text-sm hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                清空数据
              </button>
              <button
                onClick={loadStockData}
                disabled={loading}
                className="px-4 py-1.5 bg-fin-bg border border-fin-border rounded text-sm text-text-secondary hover:text-text-primary hover:border-text-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '加载中...' : '刷新'}
              </button>
            </div>
          </div>

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="mt-2 text-sm text-gold animate-pulse">
              {uploadProgress}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Error State */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-500 rounded-lg">
            <div className="text-red-400">{error}</div>
          </div>
        )}

        {/* Daily K-Line Chart */}
        <div className="mb-6">
          <div className="bg-fin-card border border-fin-border rounded-lg p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gold">日 K 线图</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-secondary">点击 K 线可标注</span>
                {annotatedIndices.length > 0 && (
                  <>
                    <span className="text-sm text-gold">已标注 {annotatedIndices.length} 个点</span>
                    <button
                      onClick={handleClearAnnotations}
                      className="px-3 py-1 text-xs bg-fin-bg border border-fin-border rounded text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors"
                    >
                      清除标注
                    </button>
                  </>
                )}
              </div>
            </div>
            <KLineChart 
              data={filteredData} 
              loading={loading}
              height={500}
              onAnnotate={handleAnnotate}
              annotatedIndices={annotatedIndices}
            />
          </div>
        </div>

        {/* Monthly K-Line Chart */}
        <div className="mb-6">
          <div className="bg-fin-card border border-fin-border rounded-lg p-4">
            <h2 className="text-lg font-bold text-gold mb-4">月 K 线图</h2>
            <MonthlyKLineChart 
              data={stockData}
              loading={loading}
              height={400}
            />
          </div>
        </div>

        {/* Five Elements Advice */}
        <div className="mb-6">
          <FiveElementsAdvice data={filteredData} />
        </div>

        {/* Date Range Info */}
        {stats && (
          <div className="mt-4 text-center text-text-secondary text-sm">
            数据时间范围: {stats.dateRange} (共 {filteredData.length} 条)
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-fin-border bg-fin-card mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-text-secondary text-sm">
          <p>
            数据来源: 上证指数 · 技术支持: React + ECharts + Supabase
          </p>
          <p className="mt-1 text-xs">
            干支转换: lunar-javascript | Excel解析: xlsx
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
