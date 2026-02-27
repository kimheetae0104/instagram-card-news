import sys
from pytrends.request import TrendReq

try:
    print("Testing Google Trends API...")
    pytrend = TrendReq(hl='ko-KR', tz=540)
    
    # 1. '부동산', '비트코인' 검색량 트렌드 조회
    # (주의: 너무 빈번하게 요청하면 429 Too Many Requests 에러 발생 가능)
    kw_list = ['부동산', "비트코인"]
    
    # 최근 3개월 데이터
    pytrend.build_payload(kw_list, cat=0, timeframe='today 3-m', geo='KR')
    data = pytrend.interest_over_time()
    
    if not data.empty:
        # 마지막 주 데이터와 12주 전(첫 주) 데이터 비교
        first_row = data.iloc[0]
        last_row = data.iloc[-1]
        
        print("\n--- Google Trends Change (%) ---")
        for kw in kw_list:
            start_val = first_row[kw]
            end_val = last_row[kw]
            if start_val > 0:
                change = ((end_val - start_val) / start_val) * 100
            else:
                change = 0 if end_val == 0 else float('inf')
                
            print(f"[{kw}] {start_val} -> {end_val} ({change:+.1f}%)")
            
    print("\nAPI is working!")
except Exception as e:
    print(f"Error: {e}")
