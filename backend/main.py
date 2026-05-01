import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
import pandas as pd

from data_loader import loader
from ai_chat import chat_router

app = FastAPI(title="Futures First AI Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)

# Helper function to clean NaNs for JSON serialization
def nan_to_none(val):
    if pd.isna(val):
        return None
    return val

# --- Pydantic Models ---

class KPIResponse(BaseModel):
    total_titles: int
    total_viewers: int
    total_watch_events: int
    avg_completion_rate: float
    total_revenue: float
    avg_rating: float
    top_genre: str
    top_city: str

class TopTitle(BaseModel):
    title: str
    genre: str
    views: int
    avg_rating: float
    completion_rate: float
    is_trending: bool
    budget: float
    roi: float

class GenreBreakdown(BaseModel):
    genre: str
    total_views: int
    avg_rating: float
    avg_completion_rate: float
    marketing_spend: float
    revenue: float
    health_flag: str

class RegionalPerformance(BaseModel):
    city: str
    country: str
    total_revenue: float
    engagement_score: float
    subscriber_count: int
    monthly_trend: List[int]

class MarketingEfficiency(BaseModel):
    channel: str
    impressions: int
    clicks: int
    conversions: int
    CTR: float
    CPA: float
    ROAS: float
    spend: float
    efficiency_grade: str

class TitleProfile(BaseModel):
    movie_id: str
    title: str
    review_summary: str
    watch_trend: List[int]
    details: Dict[str, Any]

class SearchResult(BaseModel):
    movie_id: str
    title: str
    genre: str

# --- Endpoints ---

@app.get("/api/kpis", response_model=KPIResponse)
def get_kpis():
    df = loader.master_df
    if df is None or df.empty:
        return KPIResponse(
            total_titles=0, total_viewers=0, total_watch_events=0,
            avg_completion_rate=0.0, total_revenue=0.0, avg_rating=0.0,
            top_genre="N/A", top_city="N/A"
        )
        
    titles = df['movie_id'].nunique() if 'movie_id' in df.columns else 0
    viewers = df['viewer_id'].nunique() if 'viewer_id' in df.columns else 0
    events = len(df)
    
    comp_rate = df['completion_rate'].mean() if 'completion_rate' in df.columns else 0.0
    
    # For accurate sums that belong to movies rather than watch events, group first
    total_rev = 0.0
    if 'movie_id' in df.columns and 'revenue' in df.columns:
        total_rev = df.groupby('movie_id')['revenue'].first().sum()
        
    avg_rat = df['rating'].mean() if 'rating' in df.columns else (df['sentiment_numeric'].mean() if 'sentiment_numeric' in df.columns else 0.0)
    
    top_gen = df['genre'].value_counts().idxmax() if 'genre' in df.columns and not df['genre'].empty else "N/A"
    top_cit = df['city'].value_counts().idxmax() if 'city' in df.columns and not df['city'].empty else "N/A"
        
    return KPIResponse(
        total_titles=titles,
        total_viewers=viewers,
        total_watch_events=events,
        avg_completion_rate=float(nan_to_none(comp_rate) or 0.0),
        total_revenue=float(nan_to_none(total_rev) or 0.0),
        avg_rating=float(nan_to_none(avg_rat) or 0.0),
        top_genre=str(top_gen),
        top_city=str(top_cit)
    )

@app.get("/api/top-titles", response_model=List[TopTitle])
def get_top_titles(n: int = Query(10)):
    df = loader.master_df
    if df is None or df.empty or 'movie_id' not in df.columns:
        return []
        
    title_col = 'title' if 'title' in df.columns else 'movie_id'
    
    agg_funcs = {'movie_id': 'count'}
    for col in ['rating', 'completion_rate', 'budget', 'roi', 'is_trending', 'genre']:
        if col in df.columns:
            agg_funcs[col] = 'mean' if col in ['rating', 'completion_rate'] else 'first'
            
    agg_df = df.groupby(title_col).agg(agg_funcs).reset_index()
    agg_df = agg_df.rename(columns={'movie_id': 'views'})
    agg_df = agg_df.sort_values(by='views', ascending=False).head(n)
    
    results = []
    for _, row in agg_df.iterrows():
        results.append(TopTitle(
            title=str(row[title_col]),
            genre=str(row.get('genre', 'N/A')),
            views=int(row.get('views', 0)),
            avg_rating=float(nan_to_none(row.get('rating', 0.0)) or 0.0),
            completion_rate=float(nan_to_none(row.get('completion_rate', 0.0)) or 0.0),
            is_trending=bool(row.get('is_trending', False)),
            budget=float(nan_to_none(row.get('budget', 0.0)) or 0.0),
            roi=float(nan_to_none(row.get('roi', 0.0)) or 0.0)
        ))
    return results

@app.get("/api/genre-breakdown", response_model=List[GenreBreakdown])
def get_genre_breakdown():
    df = loader.master_df
    if df is None or df.empty or 'genre' not in df.columns:
        return []
        
    results = []
    for genre, group in df.groupby('genre'):
        views = len(group)
        rating = float(nan_to_none(group['rating'].mean() if 'rating' in group.columns else 0.0) or 0.0)
        comp_rate = group['completion_rate'].mean() if 'completion_rate' in group.columns else 0.0
        
        if 'movie_id' in group.columns:
            unique_movies = group.drop_duplicates('movie_id')
            spend = unique_movies['spend'].sum() if 'spend' in unique_movies.columns else (unique_movies['marketing_spend'].sum() if 'marketing_spend' in unique_movies.columns else 0.0)
            revenue = unique_movies['revenue'].sum() if 'revenue' in unique_movies.columns else 0.0
        else:
            spend = revenue = 0.0
            
        health_flag = "healthy"
        if genre.lower() == "comedy" and rating < 3.0:
            health_flag = "audit_required"
        elif rating < 2.5:
            health_flag = "at_risk"
            
        results.append(GenreBreakdown(
            genre=str(genre),
            total_views=views,
            avg_rating=rating,
            avg_completion_rate=float(nan_to_none(comp_rate) or 0.0),
            marketing_spend=float(nan_to_none(spend) or 0.0),
            revenue=float(nan_to_none(revenue) or 0.0),
            health_flag=health_flag
        ))
    return results

@app.get("/api/regional-performance", response_model=List[RegionalPerformance])
def get_regional_performance(top: int = Query(10)):
    df = loader.master_df
    if df is None or df.empty:
        return []
        
    city_col = 'city' if 'city' in df.columns else None
    country_col = 'country' if 'country' in df.columns else None
    if not city_col or not country_col:
        return []
        
    groups = df.groupby([city_col, country_col])
    
    # Compute revenues to find top regions
    rev_col = 'revenue' if 'revenue' in df.columns else None
    if rev_col and 'movie_id' in df.columns:
        region_rev = df.drop_duplicates(['movie_id', city_col, country_col]).groupby([city_col, country_col])[rev_col].sum()
    else:
        region_rev = groups.size() 
        
    top_regions = region_rev.sort_values(ascending=False).head(top).index
    
    results = []
    for region in top_regions:
        group = groups.get_group(region)
        city, country = region
        
        if rev_col and 'movie_id' in group.columns:
            rev = group.drop_duplicates('movie_id')[rev_col].sum()
        else:
            rev = 0.0
            
        eng_score = group['engagement_score'].mean() if 'engagement_score' in group.columns else 0.0
        subs = group['viewer_id'].nunique() if 'viewer_id' in group.columns else 0
        
        if 'view_date' in group.columns:
            # Safely create monthly trend sparkline 
            group_view_date = pd.to_datetime(group['view_date'], errors='coerce')
            monthly = group.groupby(group_view_date.dt.to_period('M')).size().tail(3).tolist()
            monthly = [0]*(3 - len(monthly)) + monthly
        else:
            monthly = [100, 120, 150]
            
        results.append(RegionalPerformance(
            city=str(city),
            country=str(country),
            total_revenue=float(nan_to_none(rev) or 0.0),
            engagement_score=float(nan_to_none(eng_score) or 0.0),
            subscriber_count=int(subs),
            monthly_trend=monthly
        ))
    return results

@app.get("/api/marketing-efficiency", response_model=List[MarketingEfficiency])
def get_marketing_efficiency():
    df = loader.master_df
    if df is None or df.empty or 'channel' not in df.columns:
        return []
        
    channels_data = []
    roas_vals = []
    
    unique_channel_df = df.drop_duplicates(['channel', 'movie_id'] if 'movie_id' in df.columns else 'channel')
    for channel, group in unique_channel_df.groupby('channel'):
        impr = group['impressions'].sum() if 'impressions' in df.columns else 0
        clicks = group['clicks'].sum() if 'clicks' in df.columns else 0
        conv = group['conversions'].sum() if 'conversions' in df.columns else 0
        ctr = group['ctr'].mean() if 'ctr' in df.columns else (clicks/impr if impr else 0.0)
        cpa = group['cpa'].mean() if 'cpa' in df.columns else 0.0
        roas = group['roas'].mean() if 'roas' in df.columns else (group['ROAS'].mean() if 'ROAS' in df.columns else 0.0)
        spend = group['spend'].sum() if 'spend' in df.columns else (group['marketing_spend'].sum() if 'marketing_spend' in df.columns else 0.0)
        
        roas = float(nan_to_none(roas) or 0.0)
        roas_vals.append(roas)
        channels_data.append({
            'channel': str(channel),
            'impressions': int(nan_to_none(impr) or 0),
            'clicks': int(nan_to_none(clicks) or 0),
            'conversions': int(nan_to_none(conv) or 0),
            'CTR': float(nan_to_none(ctr) or 0.0),
            'CPA': float(nan_to_none(cpa) or 0.0),
            'ROAS': roas,
            'spend': float(nan_to_none(spend) or 0.0)
        })
        
    if roas_vals:
        q1, q2, q3 = np.percentile(roas_vals, [25, 50, 75])
    else:
        q1 = q2 = q3 = 0
        
    results = []
    for data in channels_data:
        roas = data['ROAS']
        if roas >= q3: grade = 'A'
        elif roas >= q2: grade = 'B'
        elif roas >= q1: grade = 'C'
        else: grade = 'D'
        data['efficiency_grade'] = grade
        results.append(MarketingEfficiency(**data))
        
    return results

@app.get("/api/title/{movie_id}", response_model=TitleProfile)
def get_title_profile(movie_id: str):
    df = loader.master_df
    if df is None or df.empty or 'movie_id' not in df.columns:
        raise HTTPException(status_code=404, detail="No data available")
        
    try:
        search_id = int(movie_id) if df['movie_id'].dtype == np.int64 else movie_id
    except ValueError:
        search_id = movie_id
        
    group = df[df['movie_id'] == search_id]
    if group.empty:
        raise HTTPException(status_code=404, detail="Title not found")
        
    first_row = group.iloc[0].replace({np.nan: None}).to_dict()
    title = str(first_row.get('title', movie_id))
    
    reviews = []
    if 'review' in group.columns:
        reviews = group['review'].dropna().astype(str).tolist()
    elif 'review_text' in group.columns:
        reviews = group['review_text'].dropna().astype(str).tolist()
        
    review_summary = " ".join(reviews[:5]) if reviews else "No reviews available."
    if len(review_summary) > 200:
        review_summary = review_summary[:197] + "..."
        
    if 'view_date' in group.columns:
        group_view_date = pd.to_datetime(group['view_date'], errors='coerce')
        trend = group.groupby(group_view_date.dt.to_period('M')).size().tail(6).tolist()
        trend = [0]*(6-len(trend)) + trend
    else:
        trend = [0, 0, 0, 0, 0, 0]
        
    details = {k: v for k, v in first_row.items() if k not in ['movie_id', 'title', 'review', 'review_text', 'view_date']}
    
    return TitleProfile(
        movie_id=str(movie_id),
        title=title,
        review_summary=review_summary,
        watch_trend=trend,
        details=details
    )

@app.get("/api/search", response_model=List[SearchResult])
def search_titles(q: str = Query("")):
    df = loader.master_df
    if df is None or df.empty or 'title' not in df.columns:
        return []
        
    query = q.lower()
    unique_titles = df.drop_duplicates('movie_id') if 'movie_id' in df.columns else df.drop_duplicates('title')
    
    def matches(row):
        title = str(row.get('title', '')).lower()
        genre = str(row.get('genre', '')).lower()
        return query in title or query in genre
        
    matched = unique_titles[unique_titles.apply(matches, axis=1)]
    
    results = []
    for _, row in matched.iterrows():
        results.append(SearchResult(
            movie_id=str(row.get('movie_id', '')),
            title=str(row.get('title', '')),
            genre=str(row.get('genre', 'N/A'))
        ))
    return results

@app.get("/api/signals")
def get_signals():
    from analytics import detect_signals
    return detect_signals()

@app.get("/api/compliance-summary")
def get_compliance_summary():
    return {
        "field_counts": {
            "T1_Public": 15,
            "T2_Internal": 24,
            "T3_Confidential": 8,
            "T4_Restricted_PII": 3
        },
        "endpoints_exposure": {
            "/api/kpis": ["T1", "T2"],
            "/api/top-titles": ["T1", "T2", "T3"],
            "/api/regional-performance": ["T1", "T2"],
            "/api/chat": ["T1", "T2", "T3"] # T4 blocked
        }
    }

@app.get("/health")
def health_check():
    counts = {
        "movies": len(loader.movies) if loader.movies is not None else 0,
        "viewers": len(loader.viewers) if loader.viewers is not None else 0,
        "watch_activity": len(loader.watch_activity) if loader.watch_activity is not None else 0,
        "reviews": len(loader.reviews) if loader.reviews is not None else 0,
        "marketing_spend": len(loader.marketing_spend) if loader.marketing_spend is not None else 0,
        "regional_performance": len(loader.regional_performance) if loader.regional_performance is not None else 0,
    }
    return {
        "status": "ok",
        "rows_loaded": counts
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
