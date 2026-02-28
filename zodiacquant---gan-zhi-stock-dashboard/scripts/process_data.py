#!/usr/bin/env python3
"""
上证指数数据处理脚本
将Excel数据转换为前端可用的JSON格式，并计算技术指标
"""

import json
import pandas as pd
from datetime import datetime, timedelta

# 天干地支计算
TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

# 甲子循环起始年
JIATZI_YEAR = 1984  # 1984年是甲子年

def get_ganzhi(date_str):
    """根据日期计算天干地支"""
    if isinstance(date_str, str):
        date = pd.to_datetime(date_str)
    else:
        date = date_str
    
    year = date.year
    month = date.month
    day = date.day
    
    # 计算年干支
    year_offset = year - JIATZI_YEAR
    tiangan_idx = year_offset % 10
    dizhi_idx = year_offset % 12
    year_gz = TIANGAN[tiangan_idx] + DIZHI[dizhi_idx]
    
    # 计算月干支 (农历月，需要通过节气大致估算)
    # 简化处理：使用月令地支
    month_dizhi = DIZHI[(month + 1) % 12]
    # 计算月干
    year_tiangan_idx = year_offset % 10
    month_tiangan_idx = (year_tiangan_idx * 2 + month) % 10
    month_gz = TIANGAN[month_tiangan_idx] + month_dizhi
    
    # 计算日干支 (使用蔡勒公式简化版)
    y = year
    m = month
    d = day
    
    if m < 3:
        y -= 1
        m += 12
    
    c = y // 100
    y = y % 100
    
    # 蔡勒公式计算星期，转为干支
    w = (c // 4 - 2 * c + y + y // 4 + (13 * (m + 1)) // 5 + d - 1) % 12
    
    day_gz = TIANGAN[(year * 5 + month * 3 + day) % 10] + DIZHI[(year + month + day) % 12]
    
    # 简化：使用公历日的末尾数字和月份来大致估算
    # 为确保准确性，我们使用更简化的方法
    days_since_base = (date - pd.Timestamp('1984-01-01')).days
    day_tiangan_idx = days_since_base % 10
    day_dizhi_idx = days_since_base % 12
    day_gz = TIANGAN[day_tiangan_idx] + DIZHI[day_dizhi_idx]
    
    return year_gz, month_gz, day_gz

def get_wuxing(tiangan):
    """根据天干获取五行"""
    wuxing_map = {
        '甲': '木', '乙': '木',
        '丙': '火', '丁': '火',
        '戊': '土', '己': '土',
        '庚': '金', '辛': '金',
        '壬': '水', '癸': '水'
    }
    return wuxing_map.get(tiangan, '土')

def calculate_ma(data, period):
    """计算移动平均线"""
    result = []
    for i in range(len(data)):
        if i < period - 1:
            result.append(None)
        else:
            avg = sum(d['close'] for d in data[i-period+1:i+1]) / period
            result.append(round(avg, 2))
    return result

def calculate_vol(data, period):
    """计算成交量均量"""
    result = []
    for i in range(len(data)):
        if i < period - 1:
            result.append(None)
        else:
            avg = sum(d['volume'] for d in data[i-period+1:i+1]) / period
            result.append(round(avg, 2))
    return result

def process_stock_data():
    """处理上证指数数据"""
    # 读取Excel
    df = pd.read_excel(r'C:\Users\dell\xwechat_files\wxid_7ohk351bygpj22_6b38\msg\file\2026-02\上证指数.xlsx', header=None)
    
    # 跳过前两行标题
    data_rows = df.iloc[2:].copy()
    data_rows.columns = ['date', 'open', 'high', 'low', 'close', 'volume', 'amount']
    
    # 转换日期
    data_rows['date'] = pd.to_datetime(data_rows['date'])
    
    # 过滤掉无效数据
    data_rows = data_rows.dropna(subset=['date', 'close'])
    
    # 排序
    data_rows = data_rows.sort_values('date').reset_index(drop=True)
    
    # 转换为列表
    stock_data = []
    
    for idx, row in data_rows.iterrows():
        date = row['date']
        
        # 计算干支
        year_gz, month_gz, day_gz = get_ganzhi(date)
        
        # 日干支作为主显示
        ganzhi = day_gz
        
        # 五行
        wuxing = get_wuxing(ganzhi[0])
        
        stock_data.append({
            'date': date.strftime('%Y-%m-%d'),
            'open': round(float(row['open']), 2),
            'high': round(float(row['high']), 2),
            'low': round(float(row['low']), 2),
            'close': round(float(row['close']), 2),
            'volume': int(row['volume']),
            'amount': int(row['amount']) if pd.notna(row['amount']) else 0,
            'ganzhi': ganzhi,
            'wuxing': wuxing,
            'yearGz': year_gz,
            'monthGz': month_gz
        })
    
    # 计算技术指标
    ma5 = calculate_ma(stock_data, 5)
    ma10 = calculate_ma(stock_data, 10)
    ma20 = calculate_ma(stock_data, 20)
    ma30 = calculate_ma(stock_data, 30)
    ma60 = calculate_ma(stock_data, 60)
    
    vol_ma5 = calculate_vol(stock_data, 5)
    
    for i, data in enumerate(stock_data):
        data['ma5'] = ma5[i]
        data['ma10'] = ma10[i]
        data['ma20'] = ma20[i]
        data['ma30'] = ma30[i]
        data['ma60'] = ma60[i]
        data['vol_ma5'] = vol_ma5[i]
    
    return stock_data

def main():
    print("开始处理上证指数数据...")
    
    stock_data = process_stock_data()
    
    # 保存为JSON
    output_path = r'E:\codeplace\zodiacquantGANZHI\zodiacquant---gan-zhi-stock-dashboard\public\stock_data.json'
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(stock_data, f, ensure_ascii=False, indent=2)
    
    print(f"数据处理完成！共 {len(stock_data)} 条记录")
    print(f"数据范围: {stock_data[0]['date']} 至 {stock_data[-1]['date']}")
    print(f"最新收盘价: {stock_data[-1]['close']}")
    print(f"文件已保存至: {output_path}")
    
    # 输出最新的一些数据用于验证
    print("\n最新5条数据:")
    for d in stock_data[-5:]:
        print(f"  {d['date']} | 开盘:{d['open']:.2f} 收盘:{d['close']:.2f} 干支:{d['ganzhi']} 五行:{d['wuxing']}")

if __name__ == '__main__':
    main()
