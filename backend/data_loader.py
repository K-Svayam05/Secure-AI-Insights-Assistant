import pandas as pd
import numpy as np
import os

class DataLoader:
    def __init__(self):
        self.data_dir = os.path.join(os.path.dirname(__file__), 'data')
        self.movies = None
        self.viewers = None
        self.watch_activity = None
        self.reviews = None
        self.marketing_spend = None
        self.regional_performance = None
        self.master_df = None
        
        self.load_all_data()

    def _read_csv_safe(self, filename: str) -> pd.DataFrame:
        filepath = os.path.join(self.data_dir, filename)
        if os.path.exists(filepath):
            try:
                return pd.read_csv(filepath)
            except Exception as e:
                print(f"Warning: Could not read {filename} - {e}")
                return pd.DataFrame()
        return pd.DataFrame()

    def load_all_data(self):
        """Loads all CSVs and merges them into a master dataframe."""
        self.movies = self._read_csv_safe('movies.csv')
        self.viewers = self._read_csv_safe('viewers.csv')
        self.watch_activity = self._read_csv_safe('watch_activity.csv')
        self.reviews = self._read_csv_safe('reviews.csv')
        self.marketing_spend = self._read_csv_safe('marketing_spend.csv')
        self.regional_performance = self._read_csv_safe('regional_performance.csv')

        # Base the master_df around the core events: watch_activity
        if self.watch_activity.empty:
            self.master_df = pd.DataFrame()
            return

        df = self.watch_activity.copy()

        # Merge other dataframes assuming 'movie_id' and 'viewer_id' as keys where appropriate
        if not self.movies.empty and 'movie_id' in self.movies.columns:
            df = df.merge(self.movies, on='movie_id', how='left')
            
        if not self.viewers.empty and 'viewer_id' in self.viewers.columns:
            df = df.merge(self.viewers, on='viewer_id', how='left')
            
        if not self.reviews.empty:
            merge_cols = [col for col in ['movie_id', 'viewer_id'] if col in self.reviews.columns and col in df.columns]
            if merge_cols:
                df = df.merge(self.reviews, on=merge_cols, how='left')
            
        if not self.marketing_spend.empty and 'movie_id' in self.marketing_spend.columns:
            df = df.merge(self.marketing_spend, on='movie_id', how='left')
            
        if not self.regional_performance.empty and 'movie_id' in self.regional_performance.columns:
            df = df.merge(self.regional_performance, on='movie_id', how='left')

        # Compute Derived Columns
        self._compute_derived_columns(df)
        self.master_df = df

    def _compute_derived_columns(self, df):
        # 1. engagement_score: completion_rate * (1 + 0.3*rewatch_flag)
        if 'completion_rate' in df.columns and 'rewatch_flag' in df.columns:
            df['engagement_score'] = df['completion_rate'] * (1 + 0.3 * df['rewatch_flag'].fillna(0))
        
        # 2. roi: (revenue - budget) / budget * 100
        if 'revenue' in df.columns and 'budget' in df.columns:
            # Handle potential division by zero
            df['roi'] = np.where(df['budget'] > 0, 
                                 (df['revenue'] - df['budget']) / df['budget'] * 100, 
                                 0)
            
        # 3. sentiment_numeric: map positive->1, neutral->0, negative->-1
        if 'sentiment' in df.columns:
            sentiment_map = {'positive': 1, 'neutral': 0, 'negative': -1}
            df['sentiment_numeric'] = df['sentiment'].str.lower().map(sentiment_map).fillna(0)

        # 4. days_since_release: today - release_date
        if 'release_date' in df.columns:
            today = pd.Timestamp.today()
            release_dates = pd.to_datetime(df['release_date'], errors='coerce')
            df['days_since_release'] = (today - release_dates).dt.days

        # 5. is_trending: bool, True if >50% of total views occurred in last 60 days
        if 'view_date' in df.columns and 'movie_id' in df.columns:
            df['view_date_dt'] = pd.to_datetime(df['view_date'], errors='coerce')
            sixty_days_ago = pd.Timestamp.today() - pd.Timedelta(days=60)
            
            # Identify movies that are trending
            recent_views_mask = df['view_date_dt'] >= sixty_days_ago
            
            total_views_per_movie = df.groupby('movie_id').size()
            recent_views_per_movie = df[recent_views_mask].groupby('movie_id').size()
            
            # Align indices and calculate ratio (fillna with 0 for movies with no recent views)
            recent_ratio = (recent_views_per_movie / total_views_per_movie).fillna(0)
            trending_movies = recent_ratio[recent_ratio > 0.5].index
            
            df['is_trending'] = df['movie_id'].isin(trending_movies)
            df.drop(columns=['view_date_dt'], inplace=True, errors='ignore')

    def _to_json_records(self, df):
        """Helper to return clean, JSON-serialisable dicts without NaNs."""
        if df is None or df.empty:
            return []
        return df.replace({np.nan: None}).to_dict(orient='records')

    # --- Analytics Helper Methods ---

    def get_top_titles(self, n=10):
        if self.master_df.empty or 'movie_id' not in self.master_df.columns:
            return []
            
        title_col = 'title' if 'title' in self.master_df.columns else 'movie_id'
        rating_col = 'rating' if 'rating' in self.master_df.columns else 'sentiment_numeric'
        
        # Calculate total views and avg rating per title
        agg_df = self.master_df.groupby(title_col).agg(
            total_views=('movie_id', 'count'),
        )
        
        # Add avg rating if it exists
        if rating_col in self.master_df.columns:
            rating_df = self.master_df.groupby(title_col)[rating_col].mean().rename('avg_rating')
            agg_df = agg_df.join(rating_df)
        else:
            agg_df['avg_rating'] = 0
            
        agg_df = agg_df.reset_index()
        agg_df['combined_score'] = agg_df['total_views'] + agg_df['avg_rating']
        
        top_df = agg_df.sort_values(by='combined_score', ascending=False).head(n)
        return self._to_json_records(top_df)

    def get_genre_summary(self):
        if self.master_df.empty or 'genre' not in self.master_df.columns:
            return []
            
        rating_col = 'rating' if 'rating' in self.master_df.columns else 'sentiment_numeric'
        comp_col = 'completion_rate' if 'completion_rate' in self.master_df.columns else None
        
        agg_funcs = {
            'movie_id': 'count'  # For total_views
        }
        
        if rating_col in self.master_df.columns:
            agg_funcs[rating_col] = 'mean'
            
        if comp_col and comp_col in self.master_df.columns:
            agg_funcs[comp_col] = 'mean'
            
        agg_df = self.master_df.groupby('genre').agg(agg_funcs).reset_index()
        agg_df.rename(columns={
            'movie_id': 'total_views',
            rating_col: 'avg_rating',
            comp_col: 'avg_completion_rate'
        }, inplace=True, errors='ignore')
        
        return self._to_json_records(agg_df)

    def get_regional_summary(self):
        if self.master_df.empty:
            return []
            
        group_cols = []
        for col in ['city', 'country']:
            if col in self.master_df.columns:
                group_cols.append(col)
                
        if not group_cols:
            return []

        agg_funcs = {}
        if 'revenue' in self.master_df.columns:
            agg_funcs['revenue'] = 'sum'
        if 'engagement_score' in self.master_df.columns:
            agg_funcs['engagement_score'] = 'mean'

        if not agg_funcs:
            # Fallback if specific metrics aren't present
            agg_funcs['movie_id'] = 'count'

        agg_df = self.master_df.groupby(group_cols).agg(agg_funcs).reset_index()
        agg_df.rename(columns={
            'revenue': 'total_revenue',
            'movie_id': 'total_views'
        }, inplace=True, errors='ignore')
        
        return self._to_json_records(agg_df)

    def get_marketing_efficiency(self):
        if self.master_df.empty or 'channel' not in self.master_df.columns:
            return []
            
        agg_funcs = {}
        target_cols = ['ROAS', 'CPA', 'CTR']
        
        for col in target_cols:
            # Check for case-insensitive matches in master_df
            match = next((c for c in self.master_df.columns if c.lower() == col.lower()), None)
            if match:
                agg_funcs[match] = 'mean'
                
        if not agg_funcs:
            return []
            
        agg_df = self.master_df.groupby('channel').agg(agg_funcs).reset_index()
        
        # Standardize names back to uppercase for return
        rename_map = {k: k.upper() for k in agg_funcs.keys()}
        agg_df.rename(columns=rename_map, inplace=True)
        
        if 'ROAS' in agg_df.columns:
            agg_df = agg_df.sort_values(by='ROAS', ascending=False)
            
        return self._to_json_records(agg_df)

    def get_viewer_segments(self):
        if self.master_df.empty:
            return []
            
        group_cols = []
        for col in ['subscription_tier', 'age_group']:
            # Fallback checks
            match = next((c for c in self.master_df.columns if col in c.lower()), None)
            if match:
                group_cols.append(match)
                
        if not group_cols:
            return []
            
        agg_df = self.master_df.groupby(group_cols).size().reset_index(name='user_count')
        return self._to_json_records(agg_df)

# Singleton exposed to other modules
loader = DataLoader()
