"""
Main API Router for Financial Analysis
"""
import logging
import PyPDF2
import io
import pdfplumber
import re
import os
import json
import math
from openai import AzureOpenAI
import chardet
from dotenv import load_dotenv
import pandas as pd
from pathlib import Path
from fastapi import APIRouter, File, UploadFile, HTTPException, Form, Header, Depends, Body
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from routes.auth import get_current_user_id
from cash_flow_forecaster import CashFlowForecaster, quick_forecast
from routes.cash_flow import router as cash_flow_router
from pydantic import BaseModel, Field
from collections import defaultdict


load_dotenv()
logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize Azure OpenAI client
client = None

try:
    # Check if credentials are available
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    
    if not api_key or not endpoint:
        logger.warning("⚠️  Azure OpenAI credentials not found in environment variables")
    else:
        # Initialize client WITHOUT http_client parameter
        # The newer openai library doesn't need custom http clients for proxy configuration
        client = AzureOpenAI(
            api_key=api_key,
            api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01"),
            azure_endpoint=endpoint,
        )
        logger.info("✅ Azure OpenAI client initialized successfully")
        
except Exception as e:
    logger.error(f"❌ Failed to initialize Azure OpenAI client: {e}")
    client = None

AZURE_DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4")

# In-memory storage
analysis_storage: Dict[str, Dict] = {}

# Helper function to check if OpenAI is available
def ensure_openai_available():
    """Raises HTTPException if OpenAI client is not available"""
    if client is None:
        raise HTTPException(
            status_code=503,
            detail="Azure OpenAI service is not available. Please check configuration."
        )
    return client

# ============================================================================
# HELPER FUNCTIONS FOR FINANCIAL ANALYSIS
# ============================================================================
class DynamicFinancialParser:
    """
    FIXED: Dynamic parser that handles real-world financial data formats
    - Account codes (40000 SALES)
    - Indentation (   INCOME)
    - Missing totals (calculates from items)
    """
    
    def __init__(self):
        self.patterns = {
            # P&L Metrics - REAL WORLD patterns
            'revenue': [
                r'total\s+income',
                r'total\s+revenue',
                r'income\s+total',
                r'total\s+sales',
            ],
            'cogs': [
                r'total\s+cost\s+of\s+goods\s+sold',
                r'cost\s+of\s+goods\s+sold',
                r'total\s+cogs',
            ],
            'gross_profit': [
                r'gross\s+profit',
                r'gross\s+income',
            ],
            'operating_expenses': [
                r'total\s+expenses',
                r'total\s+operating\s+expenses',
                r'operating\s+expenses\s+total',
            ],
            'net_income': [
                r'net\s+profit\s*$',
                r'net\s+income\s*$',
                r'profit\s+for\s+the\s+(year|period)',
                r'^\s*net\s+profit',
            ],
            'ebitda': [
                r'ebitda',
            ],
        
            # Balance Sheet
            'total_assets': [r'total\s+assets'],
            'current_assets': [r'total\s+current\s+assets'],
            'cash': [r'total\s+cash'],
            'accounts_receivable': [r'total\s+accounts\s+receivable'],
            'inventory': [
                r'inventory\s+asset',
                r'\d{4}\s+inventory',
            ],
            'total_liabilities': [r'total\s+liabilities'],
            'current_liabilities': [r'total\s+current\s+liabilities'],
            'accounts_payable': [r'total\s+accounts\s+payable'],
            'total_equity': [r'total\s+equity'],
        
            # Cash Flow
            'operating_cash_flow': [r'cash.*operating'],
            'investing_cash_flow': [r'cash.*investing'],
            'financing_cash_flow': [r'cash.*financing'],
            'capex': [r'capital\s+expenditure'],
        }
    
    def extract_value_from_text(self, text: str) -> Optional[float]:
        """Extract numerical value from text using regex"""
        # Handle various number formats: $1,234.56, (1,234.56), -1,234.56
        value_match = re.search(r'-?\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', text)
        if value_match:
            value_str = value_match.group(1).replace(',', '')
            value = float(value_str)
            # Check if negative (parentheses or minus sign)
            if '(' in text or text.strip().startswith('-'):
                value = -value
            return value
        return None
    
    def find_line_item_in_text(self, text: str, patterns: List[str]) -> Optional[float]:
        """Find a line item in raw text using pattern matching"""
        lines = text.split('\n')
        
        for pattern in patterns:
            regex = re.compile(pattern, re.IGNORECASE)
            for line in lines:
                if regex.search(line):
                    value = self.extract_value_from_text(line)
                    if value is not None:
                        return value
        return None
    
    def find_line_item_in_dataframe(self, df: pd.DataFrame, patterns: List[str], column_index: int = -1) -> Optional[float]:
        """
        FIXED: Improved pattern matching that handles real-world formatting
        - Strips whitespace and account codes
        - Handles indentation
        - Case insensitive matching
        """
        for pattern in patterns:
            regex = re.compile(pattern, re.IGNORECASE)
        
            for idx, row in df.iterrows():
                # Get the first column (label column)
                first_col_raw = str(row.iloc[0])
                
                # CRITICAL: Clean the text - remove leading/trailing spaces and account codes
                # Remove leading spaces, numbers, and common prefixes
                first_col_clean = re.sub(r'^\s*\d+\s*', '', first_col_raw)  # Remove leading account numbers
                first_col_clean = first_col_clean.strip().lower()
                
                # Skip empty rows
                if not first_col_clean or first_col_clean == 'nan':
                    continue
                
                # Try to match
                if regex.search(first_col_clean):
                    value = row.iloc[column_index]
                    numeric_value = self.safe_numeric_value(value)
                    if numeric_value != 0:
                        logger.info(f"  ✓ MATCHED '{pattern}'")
                        logger.info(f"    Raw: '{first_col_raw}'")
                        logger.info(f"    Clean: '{first_col_clean}'")
                        logger.info(f"    Value: {numeric_value:,.2f}")
                        return numeric_value
    
        return None
    
    def safe_numeric_value(self, value: Any) -> float:
        """Safely convert value to float"""
        try:
            if pd.isna(value):
                return 0.0
            if isinstance(value, (int, float)):
                return float(value)
            value_str = str(value).replace('$', '').replace(',', '').replace('(', '-').replace(')', '').strip()
            return float(value_str) if value_str and value_str != '-' else 0.0
        except:
            return 0.0
    
    def extract_from_raw_text(self, text: str) -> Dict[str, float]:
        """Extract all financial metrics from raw PDF text"""
        extracted = {}
        
        for key, patterns in self.patterns.items():
            value = self.find_line_item_in_text(text, patterns)
            if value is not None:
                extracted[key] = value
                logger.info(f"  ✓ Extracted {key}: {value:,.2f}")
        
        return extracted
    
    def extract_from_dataframe(self, df: pd.DataFrame) -> Dict[str, float]:
        """
        FIXED: Better extraction with smart fallbacks for real-world data
        """
        extracted = {}
        latest_col_idx = -1
    
        logger.info(f"🔍 Searching DataFrame with {len(df)} rows")
    
        # Extract everything using patterns
        for key, patterns in self.patterns.items():
            logger.info(f"🔍 Searching for '{key}'...")
            value = self.find_line_item_in_dataframe(df, patterns, latest_col_idx)
        
            if value is not None:
                extracted[key] = value
                logger.info(f"  ✅ Found {key}: {value:,.2f}")
        
        # SMART FALLBACK: If we didn't find total revenue but found income items
        if 'revenue' not in extracted:
            logger.info("💡 Revenue not found, trying to calculate from income items...")
            revenue = self._calculate_total_income_from_items(df, latest_col_idx)
            if revenue > 0:
                extracted['revenue'] = revenue
                logger.info(f"  ✅ Calculated revenue from items: {revenue:,.2f}")
        
        # SMART FALLBACK: If we didn't find COGS but found expense items
        if 'cogs' not in extracted:
            logger.info("💡 COGS not found, trying to calculate from expense items...")
            cogs = self._calculate_total_expenses_from_items(df, latest_col_idx, 'COGS')
            if cogs > 0:
                extracted['cogs'] = cogs
                logger.info(f"  ✅ Calculated COGS from items: {cogs:,.2f}")
        
        # SMART FALLBACK: If we didn't find operating expenses
        if 'operating_expenses' not in extracted:
            logger.info("💡 Operating expenses not found, trying to calculate...")
            opex = self._calculate_total_expenses_from_items(df, latest_col_idx, 'EXPENSES')
            if opex > 0:
                extracted['operating_expenses'] = opex
                logger.info(f"  ✅ Calculated operating expenses: {opex:,.2f}")
        
        # CRITICAL FIX: Post-processing validation
        self._validate_and_fix_extractions(extracted, df, latest_col_idx)
    
        return extracted
    
    def _calculate_total_income_from_items(self, df: pd.DataFrame, col_idx: int) -> float:
        """
        Calculate total income by summing individual income items
        """
        total = 0
        income_patterns = [r'sales', r'income', r'revenue', r'service']
        exclude_patterns = [r'total', r'cost', r'expense']
        
        for idx, row in df.iterrows():
            first_col_raw = str(row.iloc[0])
            first_col = re.sub(r'^\s*\d+\s*', '', first_col_raw).strip().lower()
            
            # Skip empty, total, or expense lines
            if not first_col or first_col == 'nan':
                continue
            if any(re.search(ex, first_col) for ex in exclude_patterns):
                continue
            
            # Check if it's an income line
            if any(re.search(inc, first_col) for inc in income_patterns):
                value = self.safe_numeric_value(row.iloc[col_idx])
                if value > 0:  # Only positive values
                    logger.info(f"    Adding income: {first_col[:50]} = {value:,.2f}")
                    total += value
        
        return total
    
    def _calculate_total_expenses_from_items(self, df: pd.DataFrame, col_idx: int, expense_type: str) -> float:
        """
        Calculate expenses by summing expense items
        """
        total = 0
        
        if expense_type == 'COGS':
            patterns = [r'cost\s+of\s+goods', r'cost\s+of\s+sales', r'cogs']
        else:
            patterns = [r'expense', r'operating', r'admin', r'selling']
        
        exclude_patterns = [r'total']
        
        for idx, row in df.iterrows():
            first_col_raw = str(row.iloc[0])
            first_col = re.sub(r'^\s*\d+\s*', '', first_col_raw).strip().lower()
            
            if not first_col or first_col == 'nan':
                continue
            if any(re.search(ex, first_col) for ex in exclude_patterns):
                continue
            
            if any(re.search(pat, first_col) for pat in patterns):
                value = self.safe_numeric_value(row.iloc[col_idx])
                if value != 0:
                    logger.info(f"    Adding {expense_type}: {first_col[:50]} = {value:,.2f}")
                    total += abs(value)
        
        return total
    
    def _validate_and_fix_extractions(self, extracted: Dict[str, float], df: pd.DataFrame, col_idx: int):
        """
        Validate extracted values and fix common issues
        """
        # Fix 1: net_income shouldn't be larger than gross_profit
        if 'net_income' in extracted and 'gross_profit' in extracted:
            if extracted['net_income'] > extracted['gross_profit']:
                logger.warning(f"⚠️ Net income ({extracted['net_income']}) > Gross profit ({extracted['gross_profit']})")
                
                # Try to find correct profit
                for idx, row in df.iterrows():
                    first_col = str(row.iloc[0]).strip().lower()
                    if first_col == 'profit':
                        value = self.safe_numeric_value(row.iloc[col_idx])
                        if 0 < value < extracted['gross_profit']:
                            logger.info(f"   ✓ Found correct profit: {value:,.2f}")
                            extracted['net_income'] = value
                            return
                
                # Calculate it
                if 'operating_expenses' in extracted:
                    calculated = extracted['gross_profit'] - extracted['operating_expenses']
                    logger.info(f"   ✓ Calculated net_income: {calculated:,.2f}")
                    extracted['net_income'] = calculated
        
        # Fix 2: AR/AP should be positive
        for key in ['accounts_receivable', 'accounts_payable']:
            if key in extracted and extracted[key] < 0:
                logger.warning(f"⚠️ {key} is negative: {extracted[key]}")
                extracted[key] = abs(extracted[key])
                logger.info(f"   ✓ Fixed to positive: {extracted[key]}")

    def calculate_derived_metrics(self, data: Dict[str, float]) -> Dict[str, float]:
        """Calculate metrics that can be derived from extracted data"""
        derived = {}
        
        # Gross Profit (if not found directly)
        if 'gross_profit' not in data and 'revenue' in data and 'cogs' in data:
            derived['gross_profit'] = data['revenue'] - data['cogs']
            logger.info(f"  ✓ Calculated gross_profit: {derived['gross_profit']:,.2f}")
        
        # Operating Income
        if 'gross_profit' in data and 'operating_expenses' in data:
            gp = data.get('gross_profit', derived.get('gross_profit', 0))
            derived['operating_income'] = gp - data['operating_expenses']
            logger.info(f"  ✓ Calculated operating_income: {derived['operating_income']:,.2f}")
        
        # Total Equity (if not found directly)
        if 'total_equity' not in data and 'total_assets' in data and 'total_liabilities' in data:
            derived['total_equity'] = data['total_assets'] - data['total_liabilities']
            logger.info(f"  ✓ Calculated total_equity: {derived['total_equity']:,.2f}")
        
        # Working Capital
        if 'current_assets' in data and 'current_liabilities' in data:
            derived['working_capital'] = data['current_assets'] - data['current_liabilities']
        
        # Free Cash Flow
        if 'operating_cash_flow' in data and 'capex' in data:
            derived['free_cash_flow'] = data['operating_cash_flow'] - abs(data['capex'])
        
        return derived
    
    def calculate_ratios(self, data: Dict[str, float]) -> Dict[str, float]:
        """Calculate financial ratios"""
        ratios = {}
        
        # Margin ratios
        revenue = data.get('revenue', 0)
        if revenue > 0:
            if 'gross_profit' in data:
                ratios['gross_margin'] = (data['gross_profit'] / revenue) * 100
            
            if 'operating_income' in data:
                ratios['operating_margin'] = (data['operating_income'] / revenue) * 100
            
            if 'net_income' in data:
                ratios['net_margin'] = (data['net_income'] / revenue) * 100
        
        # Liquidity ratios
        if 'current_assets' in data and 'current_liabilities' in data:
            cl = data['current_liabilities']
            if cl > 0:
                ratios['current_ratio'] = data['current_assets'] / cl
                
                # Quick ratio
                cash = data.get('cash', 0)
                ar = data.get('accounts_receivable', 0)
                ratios['quick_ratio'] = (cash + ar) / cl
        
        # Leverage ratios
        if 'total_liabilities' in data and 'total_equity' in data:
            equity = data['total_equity']
            if equity > 0:
                ratios['debt_to_equity'] = data['total_liabilities'] / equity
        
        return ratios
    
    def parse_financial_data(self, df: pd.DataFrame, raw_text: str = None) -> Dict[str, Any]:
        """
        Main parsing method - extracts all financial data from DataFrame or raw text
        """
        logger.info("🔍 Starting dynamic financial data extraction...")
        
        # Extract from DataFrame
        extracted_data = self.extract_from_dataframe(df)
        
        # If raw text is provided, extract from it too (can catch items missed in tables)
        if raw_text:
            text_data = self.extract_from_raw_text(raw_text)
            # Merge, preferring DataFrame values
            for key, value in text_data.items():
                if key not in extracted_data:
                    extracted_data[key] = value
        
        # Calculate derived metrics
        derived_data = self.calculate_derived_metrics(extracted_data)
        all_data = {**extracted_data, **derived_data}
        
        # Calculate ratios
        ratios = self.calculate_ratios(all_data)
        
        logger.info(f"✅ Extracted {len(all_data)} metrics and {len(ratios)} ratios")
        
        return {
            'raw_data': all_data,
            'ratios': ratios,
            'metadata': {
                'extraction_method': 'dynamic_pattern_matching',
                'metrics_found': len(all_data),
                'ratios_calculated': len(ratios)
            }
        }

def read_file(file_content: bytes, filename: str) -> tuple:
    """
    Main entry point - Read any supported file type into a DataFrame
    Returns: (DataFrame, raw_text_string)
    """
    try:
        file_extension = filename.lower().split('.')[-1]
        logger.info(f"📄 Reading file: {filename} (type: {file_extension})")
        
        raw_text = None  # Initialize raw_text
        
        if file_extension == 'csv':
            detected = chardet.detect(file_content)
            encoding = detected['encoding'] or 'utf-8'
            df = pd.read_csv(io.BytesIO(file_content), encoding=encoding)
            logger.info(f"✓ Loaded CSV: {df.shape[0]} rows × {df.shape[1]} columns")
            
        elif file_extension in ['xlsx', 'xls', 'xlsm', 'xlsb']:
            df = _read_excel_with_engine_detection(file_content, filename)
            logger.info(f"✓ Loaded Excel: {df.shape[0]} rows × {df.shape[1]} columns")
            
        elif file_extension == 'json':
            df = pd.read_json(io.BytesIO(file_content))
            logger.info(f"✓ Loaded JSON: {df.shape[0]} rows × {df.shape[1]} columns")
            
        elif file_extension == 'pdf':
            logger.info("📄 Processing PDF with enhanced extraction...")
            df, raw_text = extract_financial_data_from_pdf_enhanced(file_content, filename)
            logger.info(f"✓ Loaded PDF: {df.shape[0]} rows × {df.shape[1]} columns")
            
        else:
            raise ValueError(
                f"Unsupported file format: .{file_extension}. "
                f"Supported: CSV, Excel (.xlsx, .xls, .xlsm, .xlsb), JSON, PDF"
            )
        
        logger.info(f"✓ Columns: {df.columns.tolist()}")
        return df, raw_text
        
    except ValueError as ve:
        logger.error(f"❌ Validation error: {ve}")
        raise
    except Exception as e:
        logger.error(f"Failed to read '{filename}': {e}", exc_info=True)
        raise ValueError(f"Error reading file: {str(e)}")


def extract_financial_data_from_pdf(file_content: bytes, filename: str) -> pd.DataFrame:
    """
    Extract financial data from PDF, now combining all detected financial tables.
    """
    import io
    import pdfplumber
    import pandas as pd
    
    try:
        pdf_file = io.BytesIO(file_content)
        all_tables = []
        
        # Settings to help find tables without visible borders
        table_settings = {
            "vertical_strategy": "text",
            "horizontal_strategy": "text",
        }

        with pdfplumber.open(pdf_file) as pdf:
            logger.info(f"📑 PDF has {len(pdf.pages)} pages")
            
            for page_num, page in enumerate(pdf.pages, 1):
                logger.info(f"Processing page {page_num}...")
                tables = page.extract_tables(table_settings)
                
                if not tables:
                    continue

                logger.info(f"  Found {len(tables)} tables on page {page_num}")
                for table_idx, table_data in enumerate(tables):
                    try:
                        # Skip empty or headerless tables
                        if not table_data or not table_data[0]:
                            continue
                        
                        df_table = pd.DataFrame(table_data[1:], columns=table_data[0])
                        if is_financial_table(df_table):
                            logger.info(f"  ✓ Table {table_idx + 1} is a financial table.")
                            all_tables.append(df_table)
                        else:
                            logger.info(f"  ⊘ Table {table_idx + 1} is not a financial table.")
                    except Exception as e:
                        logger.warning(f"  Could not process table {table_idx + 1}: {e}")

        if not all_tables:
            logger.warning("⚠️ No financial tables were detected in the PDF.")
            raise ValueError("Could not extract any financial tables from the PDF.")

        # --- THIS IS THE KEY CHANGE ---
        # Combine all found financial tables into a single DataFrame.
        logger.info(f"✓ Combining {len(all_tables)} financial tables into one.")
        final_df = pd.concat(all_tables, ignore_index=True)
        
        # Clean the combined DataFrame
        final_df = clean_financial_dataframe(final_df)
        
        return final_df
    
    except Exception as e:
        logger.error(f"PDF extraction error for '{filename}': {e}", exc_info=True)
        raise ValueError(f"Failed to process PDF: {str(e)}")


def is_financial_table(df: pd.DataFrame) -> bool:
    """
    Check if a DataFrame contains financial data
    """
    if df.empty or len(df.columns) < 2:
        return False
    
    # Convert all data to lowercase strings for checking
    all_text = ' '.join([
        ' '.join(df.columns.astype(str).str.lower()),
        ' '.join(df.iloc[:, 0].astype(str).str.lower())
    ])
    
    # Financial keywords to look for
    financial_keywords = [
        'revenue', 'sales', 'income', 'profit', 'loss', 'expense',
        'assets', 'liabilities', 'equity', 'balance',
        'cash', 'flow', 'operating', 'investing', 'financing',
        'cost', 'margin', 'ebitda', 'depreciation', 'amortization',
        'receivable', 'payable', 'inventory', 'capital'
    ]
    
    # Check if at least 2 financial keywords are present
    keyword_count = sum(1 for keyword in financial_keywords if keyword in all_text)
    
    # Check if there are numeric values in the table
    has_numbers = False
    for col in df.columns[1:]:  # Skip first column (usually labels)
        try:
            # Try to find numeric patterns
            numeric_values = df[col].astype(str).str.extract(r'([\d,]+\.?\d*)', expand=False).dropna()
            if len(numeric_values) > 0:
                has_numbers = True
                break
        except:
            continue
    
    return keyword_count >= 2 and has_numbers


def count_financial_keywords(df: pd.DataFrame) -> int:
    """Count financial keywords in DataFrame"""
    all_text = ' '.join([
        ' '.join(df.columns.astype(str).str.lower()),
        ' '.join(df.astype(str).values.flatten())
    ])
    
    financial_keywords = [
        'revenue', 'sales', 'income', 'profit', 'expense',
        'assets', 'liabilities', 'equity', 'cash', 'margin'
    ]
    
    return sum(1 for keyword in financial_keywords if keyword in all_text)


# Replace the existing extract_financial_data_from_pdf function

def extract_financial_data_from_pdf_enhanced(file_content: bytes, filename: str) -> tuple:
    """
    Enhanced PDF extraction that returns both DataFrame and raw text
    Returns: (DataFrame, raw_text)
    """
    from collections import Counter
    
    try:
        pdf_file = io.BytesIO(file_content)
        all_tables = []
        raw_text_pages = []
        
        table_settings = {
            "vertical_strategy": "text",
            "horizontal_strategy": "text",
        }

        with pdfplumber.open(pdf_file) as pdf:
            logger.info(f"📑 PDF has {len(pdf.pages)} pages")
            
            for page_num, page in enumerate(pdf.pages, 1):
                logger.info(f"Processing page {page_num}...")
                
                # Extract raw text
                page_text = page.extract_text()
                if page_text:
                    raw_text_pages.append(page_text)
                
                # Extract tables
                tables = page.extract_tables(table_settings)
                
                if not tables:
                    continue

                logger.info(f"  Found {len(tables)} tables on page {page_num}")
                for table_idx, table_data in enumerate(tables):
                    try:
                        if not table_data or not any(table_data):
                            continue
                        
                        # Sanitize headers
                        raw_headers = table_data[0]
                        temp_headers = [str(h).strip() if h else f'Unnamed_{i}' for i, h in enumerate(raw_headers)]
                        
                        # Ensure unique headers
                        counts = Counter(temp_headers)
                        final_headers = []
                        for header in temp_headers:
                            count = counts[header]
                            if count > 1:
                                final_headers.append(f"{header}_{count}")
                                counts[header] -= 1
                            else:
                                final_headers.append(header)
                        
                        df_table = pd.DataFrame(table_data[1:], columns=final_headers)

                        if is_financial_table(df_table):
                            logger.info(f"  ✓ Table {table_idx + 1} is a financial table.")
                            all_tables.append(df_table)
                        else:
                            logger.info(f"  ⊘ Table {table_idx + 1} is not a financial table.")
                    except Exception as e:
                        logger.warning(f"  Could not process table {table_idx + 1}: {e}")

        # Combine raw text from all pages
        raw_text = "\n".join(raw_text_pages)
        
        if not all_tables:
            logger.warning("⚠️ No financial tables detected, will rely on raw text extraction")
            # Create a minimal DataFrame to avoid errors
            final_df = pd.DataFrame({'Item': ['No tables found'], 'Value': [0]})
        else:
            logger.info(f"✓ Combining {len(all_tables)} financial tables into one.")
            final_df = pd.concat(all_tables, ignore_index=True)
            final_df = clean_financial_dataframe(final_df)
        
        return final_df, raw_text
    
    except Exception as e:
        logger.error(f"PDF extraction error for '{filename}': {e}", exc_info=True)
        raise ValueError(f"Failed to process PDF: {str(e)}")

    
    except Exception as e:
        logger.error(f"PDF extraction error for '{filename}': {e}", exc_info=True)
        raise ValueError(f"Failed to process PDF: {str(e)}")


def clean_financial_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean and standardize financial DataFrame
    """
    # Remove completely empty rows
    df = df.dropna(how='all')
    
    # Remove duplicate rows
    df = df.drop_duplicates()
    
    # Clean numeric columns (remove $, commas, parentheses for negatives)
    for col in df.columns[1:]:  # Skip first column (labels)
        if df[col].dtype == 'object':
            # Replace parentheses with negative sign
            df[col] = df[col].str.replace(r'\(([^)]+)\)', r'-\1', regex=True)
            # Remove currency symbols and commas
            df[col] = df[col].str.replace(r'[\$€£,]', '', regex=True)
            # Try to convert to numeric
            df[col] = pd.to_numeric(df[col], errors='ignore')
    
    # Reset index
    df = df.reset_index(drop=True)
    
    # Ensure first column has string data
    df.iloc[:, 0] = df.iloc[:, 0].astype(str)
    
    return df
    
def _read_excel_with_engine_detection(file_content: bytes, filename: str) -> pd.DataFrame:
    """
    Internal function to read Excel files with automatic engine detection
    """
    # Determine engine from file extension
    file_ext = Path(filename).suffix.lower()
    
    if file_ext in ['.xlsx', '.xlsm']:
        engine = 'openpyxl'
    elif file_ext == '.xls':
        engine = 'xlrd'
    elif file_ext == '.xlsb':
        engine = 'pyxlsb'
    else:
        # Fallback: detect from magic bytes
        if file_content[:4] == b'PK\x03\x04':
            engine = 'openpyxl'
        elif file_content[:8] == b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1':
            engine = 'xlrd'
        else:
            engine = 'openpyxl'
    
    logger.info(f"Using Excel engine: {engine}")
    
    # Try primary engine
    try:
        return pd.read_excel(io.BytesIO(file_content), sheet_name=0, engine=engine)
    except Exception as e:
        logger.warning(f"Failed with {engine}: {e}")
        
        # Try alternative engines
        alternative_engines = ['openpyxl', 'xlrd', 'pyxlsb']
        if engine in alternative_engines:
            alternative_engines.remove(engine)
        
        for alt_engine in alternative_engines:
            try:
                logger.info(f"Trying alternative: {alt_engine}")
                return pd.read_excel(io.BytesIO(file_content), sheet_name=0, engine=alt_engine)
            except Exception as alt_e:
                logger.warning(f"Failed with {alt_engine}: {alt_e}")
                continue
        
        raise ValueError(f"Unable to read Excel file with any engine. Original error: {e}")

def detect_statement_type(df: pd.DataFrame, raw_text: str = None) -> str:
    """Detect if it's P&L, Balance Sheet, or Cash Flow"""
    # Check DataFrame
    columns_lower = [str(col).lower() for col in df.columns]
    first_column_values = df.iloc[:, 0].astype(str).str.lower().tolist()
    all_text = ' '.join(columns_lower + first_column_values)
    
    # Also check raw text if available
    if raw_text:
        all_text += ' ' + raw_text.lower()
    
    statement_types = []
    
    if any(keyword in all_text for keyword in ['revenue', 'sales', 'income', 'expense', 'profit', 'loss', 'gross profit']):
        statement_types.append("Profit & Loss")
    
    if any(keyword in all_text for keyword in ['assets', 'liabilities', 'equity', 'balance']):
        statement_types.append("Balance Sheet")
    
    if any(keyword in all_text for keyword in ['cash flow', 'operating activities', 'investing', 'financing']):
        statement_types.append("Cash Flow")
    
    if not statement_types:
        return "Financial Statement"
    
    return ", ".join(statement_types)


def extract_financial_periods(df: pd.DataFrame) -> List[str]:
    """
    Extract time periods from column headers with better cleaning.
    Returns empty list if only one period exists (will use current values instead).
    """
    periods = []
    
    for col in df.columns[1:]:  # Skip first column (usually labels)
        col_str = str(col).strip()
        
        # Skip if it's an unnamed column
        if col_str.startswith('Unnamed'):
            continue
            
        # Skip if it's empty or just whitespace
        if not col_str or col_str == 'nan':
            continue
        
        # If column has digits, it's likely a period (year, quarter, etc.)
        if any(char.isdigit() for char in col_str):
            periods.append(col_str)
        # Also include columns with month names
        elif any(month in col_str.lower() for month in ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                                                          'jul', 'aug', 'sep', 'oct', 'nov', 'dec']):
            periods.append(col_str)
        # Include columns with quarter indicators
        elif any(q in col_str.lower() for q in ['q1', 'q2', 'q3', 'q4', 'quarter']):
            periods.append(col_str)
    
    # CRITICAL: If we only have 1 or 0 numeric columns, this is a single-period statement
    # Return empty list to signal we should use current KPI values instead
    if len(periods) <= 1:
        logger.info("📅 Single period detected - will use current KPI values for chart")
        return []
    
    logger.info(f"📅 Multi-period detected: {periods}")
    return periods


def build_chart_data_from_kpis(kpis: Dict[str, Any], period_name: str = "Current") -> List[Dict[str, Any]]:
    """
    Build chart data from KPI values for single-period statements.
    For single periods, we create comparative bar chart data instead of time-series.
    """
    chart_data = []
    
    # P&L Comparative Bar Chart Data
    if "profitLoss" in kpis:
        pl = kpis["profitLoss"]
        
        revenue = pl.get("totalRevenue", 0)
        cogs = pl.get("costOfGoodsSold", 0)
        operating_expenses = pl.get("operatingExpenses", 0)
        net_income = pl.get("netIncome", 0)
        gross_profit = pl.get("grossProfit", 0)
        
        # Calculate expenses
        total_expenses = abs(cogs) + abs(operating_expenses)
        
        logger.info(f"📊 P&L Chart: Rev=${revenue:,.0f}, Exp=${total_expenses:,.0f}, Net=${net_income:,.0f}")
        
        # Create bar chart data structure with all metrics as separate categories
        chart_data.append({
            "period": period_name,
            "chartType": "bar",  # Signal to frontend to use bar chart
            "metrics": [
                {
                    "name": "Revenue",
                    "value": float(revenue),
                    "color": "#10b981"  # Green
                },
                {
                    "name": "Expenses",
                    "value": float(total_expenses),
                    "color": "#ef4444"  # Red
                },
                {
                    "name": "Gross Profit",
                    "value": float(gross_profit),
                    "color": "#3b82f6"  # Blue
                },
                {
                    "name": "Net Income",
                    "value": float(net_income),
                    "color": "#8b5cf6"  # Purple
                }
            ],
            "type": "profitLoss"
        })
    
    # Balance Sheet Comparative Bar Chart Data
    if "balanceSheet" in kpis:
        bs = kpis["balanceSheet"]
        
        assets = bs.get("totalAssets", 0)
        liabilities = bs.get("totalLiabilities", 0)
        equity = bs.get("totalEquity", 0)
        
        logger.info(f"📊 BS Chart: Assets=${assets:,.0f}, Liab=${liabilities:,.0f}, Equity=${equity:,.0f}")
        
        chart_data.append({
            "period": period_name,
            "chartType": "bar",
            "metrics": [
                {
                    "name": "Total Assets",
                    "value": float(assets),
                    "color": "#10b981"  # Green
                },
                {
                    "name": "Total Liabilities",
                    "value": float(liabilities),
                    "color": "#ef4444"  # Red
                },
                {
                    "name": "Total Equity",
                    "value": float(equity),
                    "color": "#3b82f6"  # Blue
                }
            ],
            "type": "balanceSheet"
        })
    
    # Cash Flow Comparative Bar Chart Data
    if "cashFlow" in kpis:
        cf = kpis["cashFlow"]
        
        operating_cf = cf.get("operatingCashFlow", 0)
        investing_cf = cf.get("investingCashFlow", 0)
        financing_cf = cf.get("financingCashFlow", 0)
        
        logger.info(f"📊 CF Chart: Op=${operating_cf:,.0f}, Inv=${investing_cf:,.0f}, Fin=${financing_cf:,.0f}")
        
        chart_data.append({
            "period": period_name,
            "chartType": "bar",
            "metrics": [
                {
                    "name": "Operating Cash Flow",
                    "value": float(operating_cf),
                    "color": "#10b981"  # Green
                },
                {
                    "name": "Investing Cash Flow",
                    "value": float(investing_cf),
                    "color": "#f59e0b"  # Orange
                },
                {
                    "name": "Financing Cash Flow",
                    "value": float(financing_cf),
                    "color": "#3b82f6"  # Blue
                }
            ],
            "type": "cashFlow"
        })
    
    return chart_data


def build_multi_period_chart_data(df: pd.DataFrame, period_columns: List[str], 
                                   kpis: Dict[str, Any], parser: DynamicFinancialParser) -> List[Dict[str, Any]]:
    """
    Build chart data for multi-period statements (multiple columns with dates/periods).
    For multi-period, we use line/area charts to show trends over time.
    """
    chart_data = []
    
    # P&L chart data - Time series format
    if period_columns and "profitLoss" in kpis:
        logger.info(f"📊 Building multi-period P&L chart data for {len(period_columns)} periods")
        
        for period_col in period_columns:
            try:
                col_idx = df.columns.get_loc(period_col)
                temp_parser = DynamicFinancialParser()
                
                revenue = temp_parser.find_line_item_in_dataframe(df, parser.patterns['revenue'], col_idx) or 0
                net_income = temp_parser.find_line_item_in_dataframe(df, parser.patterns['net_income'], col_idx) or 0
                gross_profit = temp_parser.find_line_item_in_dataframe(df, parser.patterns['gross_profit'], col_idx) or 0
                cogs = temp_parser.find_line_item_in_dataframe(df, parser.patterns['cogs'], col_idx) or 0
                operating_expenses = temp_parser.find_line_item_in_dataframe(df, parser.patterns['operating_expenses'], col_idx) or 0
                
                total_expenses = abs(cogs) + abs(operating_expenses)
                if gross_profit == 0 and revenue > 0 and cogs > 0:
                    gross_profit = revenue - cogs
                
                logger.info(f"  {period_col}: Rev=${revenue:,.0f}, Exp=${total_expenses:,.0f}, Net=${net_income:,.0f}")
                
                chart_data.append({
                    "period": period_col,
                    "chartType": "line",  # Signal to frontend to use line chart
                    "revenue": float(revenue),
                    "expenses": float(total_expenses),
                    "net_income": float(net_income),
                    "gross_profit": float(gross_profit),
                    "predicted": False,
                    "type": "profitLoss"
                })
            except Exception as e:
                logger.warning(f"  ⚠️ Error processing {period_col}: {e}")
                continue

    # Balance Sheet chart data - Time series format
    if period_columns and "balanceSheet" in kpis:
        logger.info(f"📊 Building multi-period Balance Sheet chart data for {len(period_columns)} periods")
        
        for period_col in period_columns:
            try:
                col_idx = df.columns.get_loc(period_col)
                temp_parser = DynamicFinancialParser()
                
                assets = temp_parser.find_line_item_in_dataframe(df, parser.patterns['total_assets'], col_idx) or 0
                liabilities = temp_parser.find_line_item_in_dataframe(df, parser.patterns['total_liabilities'], col_idx) or 0
                equity = temp_parser.find_line_item_in_dataframe(df, parser.patterns['total_equity'], col_idx) or 0
                
                if equity == 0 and assets > 0 and liabilities > 0:
                    equity = assets - liabilities
                
                logger.info(f"  {period_col}: Assets=${assets:,.0f}, Liab=${liabilities:,.0f}, Equity=${equity:,.0f}")
                
                chart_data.append({
                    "period": period_col,
                    "chartType": "line",
                    "total_assets": float(assets),
                    "total_liabilities": float(liabilities),
                    "total_equity": float(equity),
                    "predicted": False,
                    "type": "balanceSheet"
                })
            except Exception as e:
                logger.warning(f"  ⚠️ Error processing {period_col}: {e}")
                continue

    # Cash Flow chart data - Time series format
    if period_columns and "cashFlow" in kpis:
        logger.info(f"📊 Building multi-period Cash Flow chart data for {len(period_columns)} periods")
        
        for period_col in period_columns:
            try:
                col_idx = df.columns.get_loc(period_col)
                temp_parser = DynamicFinancialParser()
                
                operating_cf = temp_parser.find_line_item_in_dataframe(df, parser.patterns['operating_cash_flow'], col_idx) or 0
                investing_cf = temp_parser.find_line_item_in_dataframe(df, parser.patterns['investing_cash_flow'], col_idx) or 0
                financing_cf = temp_parser.find_line_item_in_dataframe(df, parser.patterns['financing_cash_flow'], col_idx) or 0
                
                logger.info(f"  {period_col}: Op=${operating_cf:,.0f}, Inv=${investing_cf:,.0f}, Fin=${financing_cf:,.0f}")
                
                chart_data.append({
                    "period": period_col,
                    "chartType": "line",
                    "operating_cash_flow": float(operating_cf),
                    "investing_cash_flow": float(investing_cf),
                    "financing_cash_flow": float(financing_cf),
                    "predicted": False,
                    "type": "cashFlow"
                })
            except Exception as e:
                logger.warning(f"  ⚠️ Error processing {period_col}: {e}")
                continue
    
    return chart_data

def safe_numeric_value(value: Any) -> float:
    """Safely convert value to float"""
    try:
        if pd.isna(value):
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        value_str = str(value).replace('$', '').replace(',', '').replace('(', '-').replace(')', '').strip()
        return float(value_str) if value_str and value_str != '-' else 0.0
    except:
        return 0.0


def find_row_value(df: pd.DataFrame, keywords: List[str], column_index: int = -1) -> float:
    """Find a row by keywords and extract numeric value. Searches for exact matches first."""
    for keyword in keywords:
        # Prioritize exact, case-insensitive matches to avoid partial matches (e.g., "Profit" in "Gross Profit")
        for idx, row in df.iterrows():
            first_col = str(row.iloc[0]).strip().lower()
            if keyword.lower() == first_col:
                value = row.iloc[column_index]
                numeric_value = safe_numeric_value(value)
                if numeric_value != 0:
                    logger.info(f"  Found exact match for '{keyword}': {numeric_value:,.2f}")
                    return numeric_value

    # If no exact match, search for containment (original behavior)
    for keyword in keywords:
        for idx, row in df.iterrows():
            first_col = str(row.iloc[0]).lower()
            if keyword.lower() in first_col:
                value = row.iloc[column_index]
                numeric_value = safe_numeric_value(value)
                if numeric_value != 0:
                    logger.info(f"  Found containment match for '{keyword}': {numeric_value:,.2f}")
                    return numeric_value
    return 0.0

def analyze_profit_loss(df: pd.DataFrame, periods: List[str]) -> Dict[str, Any]:
    """Extract P&L metrics"""
    logger.info("📊 Analyzing Profit & Loss statement")
    
    latest_col_idx = -1
    
    # Updated keywords to match the sample PDF
    revenue = find_row_value(df, ['total income', 'total revenue', 'revenue', 'sales'], latest_col_idx)
    cogs = find_row_value(df, ['total cost of goods sold', 'cost of goods sold', 'cogs'], latest_col_idx)
    gross_profit = find_row_value(df, ['gross profit'], latest_col_idx)
    
    if gross_profit == 0 and revenue != 0:
        gross_profit = revenue - cogs
    
    operating_expenses = find_row_value(df, ['total expenses', 'operating expenses'], latest_col_idx)
    net_income = find_row_value(df, ['profit for the year', 'net income', 'profit'], latest_col_idx)
    
    # Recalculate operating income if not found directly
    operating_income = find_row_value(df, ['operating income', 'ebit'], latest_col_idx)
    if operating_income == 0 and gross_profit != 0:
        # Assuming expenses found are operating expenses
        operating_income = gross_profit - operating_expenses
    
    gross_margin = (gross_profit / revenue * 100) if revenue != 0 else 0
    operating_margin = (operating_income / revenue * 100) if revenue != 0 else 0
    net_margin = (net_income / revenue * 100) if revenue != 0 else 0
    
    return {
        "totalRevenue": revenue,
        "costOfGoodsSold": cogs,
        "grossProfit": gross_profit,
        "grossMargin": round(gross_margin, 2),
        "operatingExpenses": operating_expenses,
        "operatingIncome": operating_income,
        "operatingMargin": round(operating_margin, 2),
        "netIncome": net_income,
        "netMargin": round(net_margin, 2),
        "ebitda": operating_income # Simplified for now
    }

def analyze_balance_sheet(df: pd.DataFrame, periods: List[str]) -> Dict[str, Any]:
    """Extract Balance Sheet metrics"""
    logger.info("📊 Analyzing Balance Sheet")
    
    latest_col_idx = -1
    
    # Assets
    current_assets = find_row_value(df, ['total current assets'], latest_col_idx)
    total_assets = find_row_value(df, ['total assets'], latest_col_idx)
    cash = find_row_value(df, ['cash and cash equivalent', 'cash'], latest_col_idx)
    accounts_receivable = find_row_value(df, ['accounts receivable', 'trade receivables'], latest_col_idx)
    inventory = find_row_value(df, ['inventory'], latest_col_idx)
    
    # Liabilities
    current_liabilities = find_row_value(df, ['total current liabilities'], latest_col_idx)
    total_liabilities = find_row_value(df, ['total liabilities'], latest_col_idx)
    accounts_payable = find_row_value(df, ['accounts payable', 'trade payables'], latest_col_idx)
    
    # Equity
    total_equity = find_row_value(df, ['total equity'], latest_col_idx)

    # Fallback logic: If Total Equity is not found, calculate it
    if total_equity == 0 and total_assets != 0 and total_liabilities != 0:
        logger.info("  Calculating Total Equity as Total Assets - Total Liabilities")
        total_equity = total_assets - total_liabilities

    # Ratios
    current_ratio = (current_assets / current_liabilities) if current_liabilities > 0 else 0
    quick_ratio = ((current_assets - inventory) / current_liabilities) if current_liabilities > 0 else 0
    debt_to_equity = (total_liabilities / total_equity) if total_equity > 0 else 0
    
    return {
        "totalAssets": total_assets,
        "currentAssets": current_assets,
        "cash": cash,
        "accountsReceivable": accounts_receivable,
        "inventory": inventory,
        "totalLiabilities": total_liabilities,
        "currentLiabilities": current_liabilities,
        "accountsPayable": accounts_payable,
        "totalEquity": total_equity,
        "currentRatio": round(current_ratio, 2),
        "quickRatio": round(quick_ratio, 2),
        "debtToEquity": round(debt_to_equity, 2),
        "workingCapital": current_assets - current_liabilities
    }

def analyze_cash_flow(df: pd.DataFrame, periods: List[str]) -> Dict[str, Any]:
    """Extract Cash Flow metrics"""
    logger.info("📊 Analyzing Cash Flow statement")
    
    latest_col_idx = -1
    
    operating_cash_flow = find_row_value(df, [
        'cash flow from operating activities',
        'operating cash flow',
        'net cash from operating'
    ], latest_col_idx)
    
    investing_cash_flow = find_row_value(df, [
        'cash flow from investing activities',
        'investing cash flow',
        'net cash from investing'
    ], latest_col_idx)
    
    financing_cash_flow = find_row_value(df, [
        'cash flow from financing activities',
        'financing cash flow',
        'net cash from financing'
    ], latest_col_idx)
    
    capex = find_row_value(df, [
        'capital expenditures',
        'capex',
        'purchase of property'
    ], latest_col_idx)
    
    free_cash_flow = operating_cash_flow - abs(capex)
    net_change_in_cash = operating_cash_flow + investing_cash_flow + financing_cash_flow
    
    return {
        "operatingCashFlow": operating_cash_flow,
        "investingCashFlow": investing_cash_flow,
        "financingCashFlow": financing_cash_flow,
        "capitalExpenditures": capex,
        "freeCashFlow": free_cash_flow,
        "netChangeInCash": net_change_in_cash
    }


def build_kpis_from_parsed_data(parsed_data: Dict[str, Any], doc_type: str) -> Dict[str, Any]:
    """
    FIXED: Only build KPI sections for data that actually exists
    """
    kpis = {}
    data = parsed_data['raw_data']
    ratios = parsed_data['ratios']
    
    logger.info(f"🔍 Building KPIs from extracted data...")
    logger.info(f"   Available metrics: {list(data.keys())}")
    
    # === P&L Section - STRICTER CONDITIONS ===
    has_pl_data = any(k in data for k in ['revenue', 'gross_profit', 'cogs', 'operating_expenses'])
    has_pl_metrics = sum(1 for k in ['revenue', 'gross_profit', 'net_income', 'cogs'] if k in data) >= 2
    
    if has_pl_data and has_pl_metrics:
        logger.info("✅ Building P&L KPIs (sufficient data found)...")
        
        revenue = data.get('revenue', 0)
        cogs = data.get('cogs', 0)
        gross_profit = data.get('gross_profit', 0)
        operating_expenses = data.get('operating_expenses', 0)
        net_income = data.get('net_income', 0)
        
        # Calculate operating income
        operating_income = data.get('operating_income', 0)
        if operating_income == 0 and gross_profit > 0 and operating_expenses > 0:
            operating_income = gross_profit - operating_expenses
        
        kpis['profitLoss'] = {
            'totalRevenue': revenue,
            'costOfGoodsSold': cogs,
            'grossProfit': gross_profit,
            'grossMargin': ratios.get('gross_margin', 0),
            'operatingExpenses': operating_expenses,
            'operatingIncome': operating_income,
            'operatingMargin': ratios.get('operating_margin', (operating_income / revenue * 100) if revenue > 0 else 0),
            'netIncome': net_income,
            'netMargin': ratios.get('net_margin', (net_income / revenue * 100) if revenue > 0 else 0),
            'ebitda': data.get('ebitda', operating_income)
        }
        
        logger.info(f"   ✓ P&L KPIs: Revenue={revenue:,.0f}, NetIncome={net_income:,.0f}")
    else:
        logger.warning(f"❌ Skipping P&L section - insufficient data")
        logger.warning(f"   has_pl_data={has_pl_data}, has_pl_metrics={has_pl_metrics}")
    
    # === Balance Sheet Section - STRICTER CONDITIONS ===
    bs_required = ['total_assets', 'total_liabilities', 'total_equity']
    has_bs_data = sum(1 for k in bs_required if k in data) >= 2
    
    if has_bs_data:
        logger.info("✅ Building Balance Sheet KPIs...")
        
        # Get values
        cash = data.get('cash', 0)
        ar = max(0, data.get('accounts_receivable', 0))
        inventory = data.get('inventory', 0)
        ap = abs(data.get('accounts_payable', 0))
        
        current_assets = data.get('current_assets', cash + ar + inventory)
        total_assets = data.get('total_assets', current_assets)
        current_liabilities = data.get('current_liabilities', ap)
        total_liabilities = data.get('total_liabilities', current_liabilities)
        total_equity = data.get('total_equity', total_assets - total_liabilities)
        
        # Calculate ratios
        current_ratio = (current_assets / current_liabilities) if current_liabilities > 0 else 0
        quick_ratio = ((current_assets - inventory) / current_liabilities) if current_liabilities > 0 else 0
        debt_to_equity = (total_liabilities / total_equity) if total_equity > 0 else 0
        
        kpis['balanceSheet'] = {
            'totalAssets': total_assets,
            'currentAssets': current_assets,
            'cash': cash,
            'accountsReceivable': ar,
            'inventory': inventory,
            'totalLiabilities': total_liabilities,
            'currentLiabilities': current_liabilities,
            'accountsPayable': ap,
            'totalEquity': total_equity,
            'currentRatio': round(current_ratio, 2),
            'quickRatio': round(quick_ratio, 2),
            'debtToEquity': round(debt_to_equity, 2),
            'workingCapital': current_assets - current_liabilities
        }
        
        logger.info(f"   ✓ BS KPIs: Assets={total_assets:,.0f}, Equity={total_equity:,.0f}")
    else:
        logger.warning(f"❌ Skipping Balance Sheet section - insufficient data")
    
    # === Cash Flow Section ===
    has_cf_data = any(k in data for k in ['operating_cash_flow', 'investing_cash_flow', 'financing_cash_flow'])
    
    if has_cf_data:
        logger.info("✅ Building Cash Flow KPIs...")
        kpis['cashFlow'] = {
            'operatingCashFlow': data.get('operating_cash_flow', 0),
            'investingCashFlow': data.get('investing_cash_flow', 0),
            'financingCashFlow': data.get('financing_cash_flow', 0),
            'capitalExpenditures': data.get('capex', 0),
            'freeCashFlow': data.get('free_cash_flow', 0),
            'netChangeInCash': sum([
                data.get('operating_cash_flow', 0),
                data.get('investing_cash_flow', 0),
                data.get('financing_cash_flow', 0)
            ])
        }
    else:
        logger.warning(f"❌ Skipping Cash Flow section - no data found")
    
    logger.info(f"📊 Final KPI sections created: {list(kpis.keys())}")
    
    return kpis

def format_currency(value: float) -> str:
    """Format number as currency"""
    if abs(value) >= 1_000_000:
        return f"${value/1_000_000:.2f}M"
    elif abs(value) >= 1_000:
        return f"${value/1_000:.1f}K"
    else:
        return f"${value:.2f}"
def calculate_health_score(kpis: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate overall financial health score"""
    score = 50
    factors = []
    
    if 'profitLoss' in kpis:
        pl = kpis['profitLoss']
        if pl.get('netMargin', 0) > 15:
            score += 10
            factors.append("Strong net margin")
        elif pl.get('netMargin', 0) > 5:
            score += 5
        
        if pl.get('grossMargin', 0) > 40:
            score += 10
            factors.append("Healthy gross margin")
    
    if 'balanceSheet' in kpis:
        bs = kpis['balanceSheet']
        if bs.get('currentRatio', 0) > 1.5:
            score += 10
            factors.append("Good liquidity")
        elif bs.get('currentRatio', 0) > 1.0:
            score += 5
        
        if bs.get('debtToEquity', 0) < 1.0:
            score += 10
            factors.append("Low debt levels")
    
    if 'cashFlow' in kpis:
        cf = kpis['cashFlow']
        if cf.get('freeCashFlow', 0) > 0:
            score += 10
            factors.append("Positive free cash flow")
    
    score = min(100, max(0, score))
    
    if score >= 80:
        summary = "Excellent"
    elif score >= 60:
        summary = "Good"
    elif score >= 40:
        summary = "Fair"
    else:
        summary = "Needs Attention"
    
    return {
        "score": score,
        "summary": summary,
        "factors": factors
    }

def generate_insights(kpis: Dict[str, Any], doc_type: str) -> List[Dict[str, Any]]:
    """Generate actionable insights with proper field names for frontend"""
    insights = []
    
    # Profit & Loss Insights
    if 'profitLoss' in kpis:
        pl = kpis['profitLoss']
        
        # Revenue insights
        revenue = pl.get('totalRevenue', 0)
        if revenue > 1000000:
            insights.append({
                "title": "Significant Revenue Scale",
                "summary": f"Revenue of ${revenue:,.0f} shows strong market presence and demonstrates solid business fundamentals.",
                "severity": "info",
                "recommendation": "Maintain current growth trajectory while optimizing operational efficiency.",
                "metric_focus": "revenue",
                "kpi_refs": ["revenue"]
            })
        elif revenue > 0:
            insights.append({
                "title": "Revenue Generated",
                "summary": f"Current revenue at ${revenue:,.0f} indicates active business operations.",
                "severity": "info",
                "recommendation": "Focus on sustainable revenue growth strategies.",
                "metric_focus": "revenue",
                "kpi_refs": ["revenue"]
            })
        
        # Profitability insights
        net_margin = pl.get('netMargin', 0)
        if net_margin > 15:
            insights.append({
                "title": "Strong Profitability",
                "summary": f"Net margin of {net_margin:.1f}% indicates excellent profit efficiency and strong business model.",
                "severity": "info",
                "recommendation": "Maintain pricing discipline and continue cost optimization to sustain these strong margins.",
                "metric_focus": "net_margin",
                "kpi_refs": ["net_margin", "operating_margin"]
            })
        elif net_margin > 5:
            insights.append({
                "title": "Moderate Profitability",
                "summary": f"Net margin of {net_margin:.1f}% is acceptable but has room for improvement through operational optimization.",
                "severity": "info",
                "recommendation": "Review operating expenses and explore pricing optimization opportunities to improve profitability.",
                "metric_focus": "net_margin",
                "kpi_refs": ["net_margin", "operating_expenses"]
            })
        elif net_margin < 0:
            insights.append({
                "title": "Profitability Challenge",
                "summary": f"Negative net margin of {net_margin:.1f}% requires immediate attention to prevent sustained losses.",
                "severity": "critical",
                "recommendation": "Focus on revenue growth and aggressive cost reduction initiatives. Consider strategic pricing adjustments.",
                "metric_focus": "net_margin",
                "kpi_refs": ["net_margin", "revenue", "operating_expenses"]
            })
        
        # Gross margin insights
        gross_margin = pl.get('grossMargin', 0)
        if gross_margin > 60:
            insights.append({
                "title": "Excellent Gross Margin",
                "summary": f"Gross margin of {gross_margin:.1f}% shows strong pricing power and efficient cost management.",
                "severity": "info",
                "recommendation": "Maintain current pricing strategy and continue to optimize supplier relationships.",
                "metric_focus": "gross_margin",
                "kpi_refs": ["gross_margin", "cogs"]
            })
        elif gross_margin < 30:
            insights.append({
                "title": "Low Gross Margin",
                "summary": f"Gross margin of {gross_margin:.1f}% may limit profitability and financial flexibility.",
                "severity": "warning",
                "recommendation": "Review pricing strategy and negotiate better supplier costs. Consider product mix optimization.",
                "metric_focus": "gross_margin",
                "kpi_refs": ["gross_margin", "cogs", "revenue"]
            })
        
        # Operating efficiency
        operating_margin = pl.get('operatingMargin', 0)
        if operating_margin > 20:
            insights.append({
                "title": "Efficient Operations",
                "summary": f"Operating margin of {operating_margin:.1f}% demonstrates operational excellence and strong cost control.",
                "severity": "info",
                "recommendation": "Continue current operational practices and look for opportunities to scale efficiency gains.",
                "metric_focus": "operating_margin",
                "kpi_refs": ["operating_margin", "operating_expenses"]
            })
        elif operating_margin < 10 and operating_margin > 0:
            insights.append({
                "title": "Operating Efficiency Opportunity",
                "summary": f"Operating margin of {operating_margin:.1f}% suggests significant room for operational improvement.",
                "severity": "info",
                "recommendation": "Analyze and optimize operating expenses. Implement cost control measures and improve process efficiency.",
                "metric_focus": "operating_margin",
                "kpi_refs": ["operating_margin", "operating_expenses", "revenue"]
            })
    
    # Balance Sheet Insights
    if 'balanceSheet' in kpis:
        bs = kpis['balanceSheet']
        
        # Liquidity insights
        current_ratio = bs.get('currentRatio', 0)
        if current_ratio < 1.0:
            insights.append({
                "title": "Liquidity Concern",
                "summary": f"Current ratio of {current_ratio:.2f} suggests potential cash flow issues and difficulty meeting short-term obligations.",
                "severity": "critical",
                "recommendation": "Focus on accelerating collections, managing payables strategically, and securing additional working capital if needed.",
                "metric_focus": "current_ratio",
                "kpi_refs": ["current_ratio", "current_assets", "current_liabilities"]
            })
        elif current_ratio > 2.0:
            insights.append({
                "title": "Strong Liquidity Position",
                "summary": f"Current ratio of {current_ratio:.2f} indicates current assets comfortably cover short-term obligations.",
                "severity": "info",
                "recommendation": "Consider deploying excess liquidity into growth initiatives or debt reduction to optimize capital efficiency.",
                "metric_focus": "current_ratio",
                "kpi_refs": ["current_ratio", "current_assets", "cash"]
            })
        elif current_ratio >= 1.5:
            insights.append({
                "title": "Healthy Liquidity",
                "summary": f"Current ratio of {current_ratio:.2f} indicates good short-term financial health and operational flexibility.",
                "severity": "info",
                "recommendation": "Maintain current working capital management practices.",
                "metric_focus": "current_ratio",
                "kpi_refs": ["current_ratio"]
            })
        
        # Debt insights
        debt_to_equity = bs.get('debtToEquity', 0)
        if debt_to_equity > 2.0:
            insights.append({
                "title": "High Leverage",
                "summary": f"Debt-to-equity ratio of {debt_to_equity:.2f} indicates significant financial leverage and elevated risk.",
                "severity": "warning",
                "recommendation": "Consider debt reduction strategies to lower financial risk. Prioritize cash flow towards debt paydown.",
                "metric_focus": "debt_to_equity",
                "kpi_refs": ["debt_to_equity", "total_liabilities", "total_equity"]
            })
        elif debt_to_equity < 0.5:
            insights.append({
                "title": "Conservative Capital Structure",
                "summary": f"Low debt-to-equity ratio of {debt_to_equity:.2f} shows financial stability and minimal leverage risk.",
                "severity": "info",
                "recommendation": "Consider strategic use of leverage for growth if returns exceed cost of capital.",
                "metric_focus": "debt_to_equity",
                "kpi_refs": ["debt_to_equity"]
            })
        
        # Working capital
        working_capital = bs.get('workingCapital', 0)
        if working_capital < 0:
            insights.append({
                "title": "Negative Working Capital",
                "summary": "Current liabilities exceed current assets, indicating potential liquidity constraints.",
                "severity": "critical",
                "recommendation": "Improve cash collection processes and reduce short-term obligations. Consider working capital financing options.",
                "metric_focus": "working_capital",
                "kpi_refs": ["working_capital", "current_assets", "current_liabilities"]
            })
    
    # Cash Flow Insights
    if 'cashFlow' in kpis:
        cf = kpis['cashFlow']
        
        # Operating cash flow
        operating_cf = cf.get('operatingCashFlow', 0)
        if operating_cf > 0:
            insights.append({
                "title": "Positive Operating Cash Flow",
                "summary": f"Generating ${abs(operating_cf):,.0f} from core business operations demonstrates strong cash generation capability.",
                "severity": "info",
                "recommendation": "Continue monitoring cash conversion cycle and maintain operational efficiency.",
                "metric_focus": "operating_cash_flow",
                "kpi_refs": ["operating_cash_flow"]
            })
        else:
            insights.append({
                "title": "Negative Operating Cash Flow",
                "summary": f"Operations are consuming ${abs(operating_cf):,.0f} in cash, indicating cash generation challenges.",
                "severity": "warning",
                "recommendation": "Focus on improving cash conversion cycle through faster collections and optimized inventory management.",
                "metric_focus": "operating_cash_flow",
                "kpi_refs": ["operating_cash_flow", "revenue"]
            })
        
        # Free cash flow
        free_cf = cf.get('freeCashFlow', 0)
        if free_cf < 0:
            insights.append({
                "title": "Negative Free Cash Flow",
                "summary": f"Company is spending ${abs(free_cf):,.0f} more than it generates, potentially due to growth investments.",
                "severity": "warning",
                "recommendation": "Review capital expenditures for ROI and improve cash conversion cycle. Ensure spending aligns with strategic priorities.",
                "metric_focus": "free_cash_flow",
                "kpi_refs": ["free_cash_flow", "operating_cash_flow", "capex"]
            })
        elif free_cf > 0:
            insights.append({
                "title": "Positive Free Cash Flow",
                "summary": f"Generating ${free_cf:,.0f} in free cash flow provides financial flexibility for strategic initiatives.",
                "severity": "info",
                "recommendation": "Consider reinvestment opportunities for growth, debt reduction, or shareholder returns based on strategic priorities.",
                "metric_focus": "free_cash_flow",
                "kpi_refs": ["free_cash_flow"]
            })
    
    # If no insights generated, add a default one
    if len(insights) == 0:
        insights.append({
            "title": "Analysis Complete",
            "summary": "Financial data processed successfully. Upload additional financial statements for more comprehensive insights.",
            "severity": "info",
            "recommendation": "Upload profit & loss, balance sheet, and cash flow statements for detailed analysis.",
            "metric_focus": "general",
            "kpi_refs": []
        })
    
    logger.info(f"✓ Generated {len(insights)} insights")
    return insights

def format_currency(value: float) -> str:
    """Format number as currency"""
    if abs(value) >= 1_000_000:
        return f"${value/1_000_000:.2f}M"
    elif abs(value) >= 1_000:
        return f"${value/1_000:.1f}K"
    else:
        return f"${value:.2f}"


"""
AI Financial Analysis Generator
Add these functions to your main.py file
"""

def generate_ai_financial_analysis(kpis: Dict[str, Any], doc_type: str, df: pd.DataFrame) -> Dict[str, Any]:
    """
    Generate comprehensive AI-powered financial analysis
    """
    # Extract key metrics for analysis
    analysis_context = extract_analysis_context(kpis, doc_type, df)
    
    # Generate different types of analysis
    quantitative_analysis = generate_quantitative_analysis(analysis_context)
    qualitative_analysis = generate_qualitative_analysis(analysis_context)
    recommendations = generate_strategic_recommendations(analysis_context)
    risk_assessment = generate_risk_assessment(analysis_context)
    
    return {
        "overview": generate_executive_summary(analysis_context),
        "quantitative": quantitative_analysis,
        "qualitative": qualitative_analysis,
        "recommendations": recommendations,
        "risks": risk_assessment,
        "nextSteps": generate_next_steps(analysis_context)
    }

def generate_executive_summary(context: Dict[str, Any]) -> str:
    """Generate comprehensive executive summary with detailed financial analysis"""
    doc_type = context.get('doc_type', 'Financial Statement')
    
    summary_parts = []
    
    # PARAGRAPH 1: Overall Financial Position & Scale
    summary_parts.append(f"**Analysis of {doc_type}**\n\n")
    
    if 'revenue' in context:
        revenue = context['revenue']
        if revenue > 50_000_000:
            summary_parts.append(f"The company demonstrates enterprise-scale operations with revenue of ${revenue:,.0f}, positioning it firmly in the upper-mid to large-market segment. This revenue base provides significant economies of scale and market presence, creating a strong foundation for sustainable growth and competitive positioning. ")
        elif revenue > 10_000_000:
            summary_parts.append(f"The company has achieved substantial market traction with revenue of ${revenue:,.0f}, indicating strong product-market fit and successful customer acquisition. This scale represents a critical inflection point where operational leverage and efficiency gains become increasingly significant drivers of profitability. ")
        elif revenue > 1_000_000:
            summary_parts.append(f"The company has established a solid revenue foundation at ${revenue:,.0f}, demonstrating viable product-market fit and early commercial success. This revenue level indicates the company has moved beyond the startup phase into growth mode, with proven ability to generate consistent customer demand. ")
        else:
            summary_parts.append(f"Current revenue of ${revenue:,.0f} reflects early-stage operations with the company still in the process of establishing market presence. This phase presents significant growth opportunities as the business scales its go-to-market efforts and refines its value proposition. ")
    
    # PARAGRAPH 2: Deep Dive into Profitability
    if 'profitability' in context:
        net_margin = context.get('net_margin', 0)
        gross_margin = context.get('gross_margin', 0)
        operating_margin = context.get('operating_margin', 0)
        
        summary_parts.append(f"\n\n**Profitability Analysis:** ")
        
        if context['profitability'] == 'high':
            summary_parts.append(f"The company exhibits exceptional profitability metrics with a net margin of {net_margin:.1f}%, significantly above industry standards and demonstrating superior operational efficiency and pricing power. The gross margin of {gross_margin:.1f}% indicates strong unit economics and favorable cost structure, while the operating margin of {operating_margin:.1f}% reflects effective expense management and scalable operations. This profitability profile suggests the company has achieved sustainable competitive advantages through either technological differentiation, operational excellence, or market positioning. The healthy margin cascade from gross to net profit indicates well-controlled operating expenses and effective capital allocation, positioning the company for continued value creation. ")
        elif context['profitability'] == 'medium':
            summary_parts.append(f"Profitability metrics show moderate performance with a net margin of {net_margin:.1f}%, indicating acceptable but improvable operational efficiency. The gross margin of {gross_margin:.1f}% suggests decent unit economics, though the compression to an operating margin of {operating_margin:.1f}% reveals opportunities for operational leverage and expense optimization. The {gross_margin - operating_margin:.1f} percentage point gap between gross and operating margins indicates that operating expenses are consuming a significant portion of gross profit, presenting clear opportunities for margin expansion through operational efficiency initiatives, process automation, and strategic cost management. With focused execution on operational improvements, the company could realistically target net margins in the 15-20% range. ")
        else:
            summary_parts.append(f"Profitability requires immediate strategic attention with a net margin of {net_margin:.1f}%, below sustainable levels for long-term value creation. While the gross margin of {gross_margin:.1f}% may indicate acceptable unit economics, the significant erosion to an operating margin of {operating_margin:.1f}% reveals fundamental challenges in operational efficiency and cost structure. The {gross_margin - operating_margin:.1f} percentage point differential between gross and operating margins suggests that operating expenses are disproportionately high relative to gross profit generation, requiring comprehensive operational review and restructuring. Priority actions should include zero-based budgeting review, process optimization, strategic resource reallocation, and potential business model refinement to achieve sustainable profitability. ")
    
    # PARAGRAPH 3: Liquidity & Balance Sheet Strength
    if 'liquidity' in context:
        current_ratio = context.get('current_ratio', 0)
        debt_to_equity = context.get('debt_to_equity', 0)
        working_capital = context.get('working_capital', 0)
        
        summary_parts.append(f"\n\n**Financial Position & Liquidity:** ")
        
        if context['liquidity'] == 'strong':
            summary_parts.append(f"The company maintains a robust financial position with a current ratio of {current_ratio:.2f}, providing substantial liquidity buffer well above the 1.5x threshold considered healthy for most industries. Working capital of ${abs(working_capital):,.0f} provides ample runway for operational needs and strategic initiatives. ")
        elif context['liquidity'] == 'adequate':
            summary_parts.append(f"Liquidity is adequate with a current ratio of {current_ratio:.2f}, meeting minimum thresholds but requiring careful monitoring to ensure sufficient financial flexibility. Working capital of ${abs(working_capital):,.0f} provides moderate cushion for operations. ")
        else:
            summary_parts.append(f"⚠️ **Critical liquidity concerns exist** with a current ratio of {current_ratio:.2f}, indicating that current liabilities {'exceed' if current_ratio < 1.0 else 'closely approach'} current assets. This creates significant financial risk and limits strategic flexibility. Working capital of ${working_capital:,.0f} {'is negative, meaning the company owes more in short-term obligations than it has in liquid assets' if working_capital < 0 else 'provides minimal buffer'}. Immediate actions required include accelerating receivables collection, negotiating extended payment terms with suppliers, and potentially securing additional working capital financing. ")
        
        if debt_to_equity < 0.5:
            summary_parts.append(f"The conservative capital structure with a debt-to-equity ratio of {debt_to_equity:.2f} demonstrates financial prudence and provides significant borrowing capacity for future growth initiatives or market opportunities. This low leverage creates strategic optionality and reduces financial risk during economic downturns. ")
        elif debt_to_equity < 1.5:
            summary_parts.append(f"The moderate debt-to-equity ratio of {debt_to_equity:.2f} is within acceptable industry norms, balancing the benefits of leverage with financial stability. While debt levels are manageable, any significant increase in leverage should be carefully evaluated against cash generation capacity. ")
        else:
            summary_parts.append(f"High financial leverage with a debt-to-equity ratio of {debt_to_equity:.2f} creates elevated risk and limits financial flexibility. This leverage level constrains the company's ability to weather economic downturns, pursue strategic opportunities, or make necessary investments in growth. Debt reduction should be prioritized through improved cash generation and strategic capital allocation. ")
    
    # PARAGRAPH 4: Cash Generation & Sustainability
    if 'cash_generation' in context:
        free_cf = context.get('free_cf', 0)
        operating_cf = context.get('operating_cf', 0)
        
        summary_parts.append(f"\n\n**Cash Generation & Sustainability:** ")
        
        if context['cash_generation'] == 'positive':
            summary_parts.append(f"Strong cash generation capabilities with ${abs(free_cf):,.0f} in free cash flow demonstrate that the business model is not only profitable on an accounting basis but also efficiently converts earnings into cash. Operating cash flow of ${abs(operating_cf):,.0f} indicates healthy cash conversion from core business operations. This positive free cash flow provides strategic flexibility for growth investments, debt reduction, shareholder returns, or building cash reserves. The company's ability to self-fund growth reduces dependence on external financing and provides resilience during market volatility. ")
        else:
            summary_parts.append(f"Cash generation requires attention with negative free cash flow of ${abs(free_cf):,.0f}, indicating the business is currently consuming more cash than it generates. Operating cash flow of ${abs(operating_cf):,.0f} suggests {'challenges in converting revenue to cash' if operating_cf < 0 else 'heavy capital investment requirements'}. This cash burn necessitates careful management of the cash conversion cycle, including accelerating customer collections, optimizing inventory levels, and extending payables where strategically appropriate. {'The company may need to secure additional financing to support operations and growth until cash flow turns positive' if free_cf < -100000 else 'Focus should be on improving operating efficiency and working capital management to achieve positive cash flow'}. ")
    
    # PARAGRAPH 5: Strategic Positioning
    summary_parts.append(f"\n\n**Strategic Position & Competitive Outlook:** ")
    
    competitive_position = []
    if context.get('gross_margin', 0) > 60:
        competitive_position.append("strong pricing power and product differentiation")
    if context.get('revenue', 0) > 10_000_000:
        competitive_position.append("established market presence with scale advantages")
    if context.get('cash_generation') == 'positive':
        competitive_position.append("self-sustaining growth model with positive unit economics")
    if context.get('liquidity') == 'strong':
        competitive_position.append("financial resilience to weather market volatility")
    
    if competitive_position:
        summary_parts.append(f"The company demonstrates {', '.join(competitive_position[:-1])}{' and ' + competitive_position[-1] if len(competitive_position) > 1 else competitive_position[0]}. ")
    
    # PARAGRAPH 6: Key Priorities & Outlook
    summary_parts.append(f"\n\n**Strategic Priorities:** ")
    
    priorities = []
    if context.get('profitability') == 'low' or context.get('net_margin', 0) < 5:
        priorities.append("**1. Profitability Enhancement** - Immediate focus on margin improvement through operational efficiency, pricing optimization, and cost structure refinement to achieve sustainable unit economics")
    
    if context.get('liquidity') == 'weak':
        priorities.append("**2. Liquidity Strengthening** - Critical priority to improve working capital management, accelerate cash collection, and secure appropriate financing to ensure operational stability")
    
    if context.get('cash_generation') == 'negative' and context.get('liquidity') != 'weak':
        priorities.append("**2. Cash Flow Optimization** - Focus on improving cash conversion cycle and achieving positive free cash flow to support sustainable growth")
    
    if context.get('profitability') in ['medium', 'high'] and context.get('liquidity') == 'strong':
        priorities.append("**1. Growth Acceleration** - Leverage strong financial position to capture market share through strategic investments in sales, marketing, and product development")
        priorities.append("**2. Operational Scaling** - Invest in systems, processes, and talent to support efficient growth while maintaining or improving margins")
    
    if context.get('gross_margin', 0) < 40:
        priorities.append("**3. Margin Expansion** - Strategic initiatives to improve gross margins through value-based pricing, supplier negotiations, and product mix optimization")
    
    if not priorities:
        priorities.append("**1. Sustain Performance** - Maintain current strong financial performance while identifying opportunities for continuous improvement")
        priorities.append("**2. Strategic Investment** - Allocate capital to highest-return opportunities in market expansion, product innovation, or operational excellence")
        priorities.append("**3. Risk Management** - Monitor key financial metrics and market conditions to proactively address emerging challenges")
    
    summary_parts.append(". ".join(priorities[:3]) + ". ")
    
    return "".join(summary_parts)


def extract_analysis_context(kpis: Dict[str, Any], doc_type: str, df: pd.DataFrame) -> Dict[str, Any]:
    """Extract all relevant metrics for analysis"""
    context = {
        "doc_type": doc_type,
        "data_quality": {
            "rows": len(df),
            "columns": len(df.columns),
            "completeness": (1 - df.isnull().sum().sum() / (len(df) * len(df.columns))) * 100
        }
    }
    
    # Add P&L context
    if 'profitLoss' in kpis:
        pl = kpis['profitLoss']
        context['revenue'] = pl.get('totalRevenue', 0)
        context['gross_margin'] = pl.get('grossMargin', 0)
        context['operating_margin'] = pl.get('operatingMargin', 0)
        context['net_margin'] = pl.get('netMargin', 0)
        context['profitability'] = 'high' if pl.get('netMargin', 0) > 15 else 'medium' if pl.get('netMargin', 0) > 5 else 'low'
    
    # Add Balance Sheet context
    if 'balanceSheet' in kpis:
        bs = kpis['balanceSheet']
        context['current_ratio'] = bs.get('currentRatio', 0)
        context['debt_to_equity'] = bs.get('debtToEquity', 0)
        context['working_capital'] = bs.get('workingCapital', 0)
        context['liquidity'] = 'strong' if bs.get('currentRatio', 0) > 1.5 else 'adequate' if bs.get('currentRatio', 0) > 1.0 else 'weak'
    
    # Add Cash Flow context
    if 'cashFlow' in kpis:
        cf = kpis['cashFlow']
        context['operating_cf'] = cf.get('operatingCashFlow', 0)
        context['free_cf'] = cf.get('freeCashFlow', 0)
        context['cash_generation'] = 'positive' if cf.get('freeCashFlow', 0) > 0 else 'negative'
    
    return context


def generate_quantitative_analysis(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate quantitative analysis points"""
    analysis = []
    
    # Revenue analysis
    if 'revenue' in context:
        revenue = context['revenue']
        analysis.append({
            "metric": "Revenue Scale",
            "value": f"${revenue:,.0f}",
            "interpretation": get_revenue_interpretation(revenue),
            "benchmark": get_revenue_benchmark(revenue)
        })
    
    # Margin analysis
    if 'gross_margin' in context:
        gm = context['gross_margin']
        analysis.append({
            "metric": "Gross Margin",
            "value": f"{gm:.1f}%",
            "interpretation": get_margin_interpretation(gm, "gross"),
            "benchmark": "Industry average: 40-60%"
        })
    
    if 'operating_margin' in context:
        om = context['operating_margin']
        analysis.append({
            "metric": "Operating Margin",
            "value": f"{om:.1f}%",
            "interpretation": get_margin_interpretation(om, "operating"),
            "benchmark": "Industry average: 15-25%"
        })
    
    if 'net_margin' in context:
        nm = context['net_margin']
        analysis.append({
            "metric": "Net Margin",
            "value": f"{nm:.1f}%",
            "interpretation": get_margin_interpretation(nm, "net"),
            "benchmark": "Industry average: 10-20%"
        })
    
    # Liquidity analysis
    if 'current_ratio' in context:
        cr = context['current_ratio']
        analysis.append({
            "metric": "Current Ratio",
            "value": f"{cr:.2f}",
            "interpretation": get_liquidity_interpretation(cr),
            "benchmark": "Healthy range: 1.5-3.0"
        })
    
    # Leverage analysis
    if 'debt_to_equity' in context:
        de = context['debt_to_equity']
        analysis.append({
            "metric": "Debt-to-Equity",
            "value": f"{de:.2f}",
            "interpretation": get_leverage_interpretation(de),
            "benchmark": "Conservative: <0.5, Moderate: 0.5-1.5"
        })
    
    return analysis


def generate_qualitative_analysis(context: Dict[str, Any]) -> List[Dict[str, str]]:
    """Generate qualitative insights"""
    insights = []
    
    # Business model assessment
    if 'gross_margin' in context and 'operating_margin' in context:
        gm = context['gross_margin']
        om = context['operating_margin']
        
        if gm > 60:
            insights.append({
                "category": "Business Model Strength",
                "insight": "High gross margins suggest strong pricing power, differentiated product/service, or efficient production. This provides a solid foundation for profitability.",
                "implication": "The company has room to invest in growth while maintaining profitability."
            })
        
        if gm - om > 40:
            insights.append({
                "category": "Operating Efficiency",
                "insight": "Significant gap between gross and operating margins indicates high operating expenses relative to gross profit.",
                "implication": "There's substantial opportunity to improve profitability through operational efficiency gains."
            })
    
    # Growth sustainability
    if 'cash_generation' in context:
        if context['cash_generation'] == 'positive':
            insights.append({
                "category": "Growth Sustainability",
                "insight": "Positive free cash flow indicates the business can fund growth internally without excessive reliance on external capital.",
                "implication": "Strong position for sustainable expansion and shareholder value creation."
            })
        else:
            insights.append({
                "category": "Growth Sustainability",
                "insight": "Negative free cash flow suggests the company is investing heavily or facing cash conversion challenges.",
                "implication": "Monitor cash runway and ensure adequate financing for ongoing operations."
            })
    
    # Financial stability
    if 'liquidity' in context and 'debt_to_equity' in context:
        if context['liquidity'] == 'strong' and context['debt_to_equity'] < 1.0:
            insights.append({
                "category": "Financial Stability",
                "insight": "Strong liquidity combined with conservative leverage indicates robust financial health.",
                "implication": "Well-positioned to weather economic downturns and capitalize on opportunities."
            })
        elif context['liquidity'] == 'weak' or context['debt_to_equity'] > 2.0:
            insights.append({
                "category": "Financial Risk",
                "insight": "Combination of liquidity constraints and/or high leverage creates financial vulnerability.",
                "implication": "Priority should be placed on strengthening the balance sheet before pursuing aggressive growth."
            })
    
    return insights


def generate_strategic_recommendations(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate strategic recommendations"""
    recommendations = []
    
    # Revenue optimization
    if 'revenue' in context:
        recommendations.append({
            "priority": "high",
            "category": "Revenue Growth",
            "title": "Revenue Diversification Strategy",
            "description": "Analyze customer concentration and explore new market segments to reduce dependency risk.",
            "actions": [
                "Conduct customer segmentation analysis",
                "Identify underserved market opportunities",
                "Develop pricing strategy for new segments",
                "Create customer acquisition roadmap"
            ],
            "expectedImpact": "10-30% revenue growth potential"
        })
    
    # Margin improvement
    if 'gross_margin' in context and context['gross_margin'] < 50:
        recommendations.append({
            "priority": "high",
            "category": "Profitability",
            "title": "Gross Margin Enhancement",
            "description": "Improve gross margins through pricing optimization and cost reduction initiatives.",
            "actions": [
                "Review pricing strategy and competitive positioning",
                "Negotiate better terms with suppliers",
                "Implement value-based pricing where applicable",
                "Reduce material waste and improve production efficiency"
            ],
            "expectedImpact": f"Target: Increase gross margin from {context['gross_margin']:.1f}% to 50%+"
        })
    
    # Operating efficiency
    if 'operating_margin' in context and context['operating_margin'] < context.get('gross_margin', 0) - 30:
        recommendations.append({
            "priority": "medium",
            "category": "Operational Efficiency",
            "title": "Operating Expense Optimization",
            "description": "Streamline operations to reduce the gap between gross and operating margins.",
            "actions": [
                "Conduct zero-based budgeting review",
                "Automate manual processes",
                "Consolidate vendors and renegotiate contracts",
                "Implement performance metrics and accountability"
            ],
            "expectedImpact": "5-10% operating margin improvement"
        })
    
    # Cash flow improvement
    if context.get('cash_generation') == 'negative':
        recommendations.append({
            "priority": "high",
            "category": "Cash Management",
            "title": "Cash Flow Acceleration",
            "description": "Improve cash conversion cycle to strengthen financial position.",
            "actions": [
                "Accelerate invoicing and collections (target: 30-day DSO)",
                "Negotiate extended payment terms with suppliers",
                "Reduce inventory holding periods",
                "Implement cash forecasting dashboard"
            ],
            "expectedImpact": "30-60 day improvement in cash conversion cycle"
        })
    
    # Liquidity strengthening
    if context.get('liquidity') == 'weak':
        recommendations.append({
            "priority": "critical",
            "category": "Financial Health",
            "title": "Liquidity Enhancement",
            "description": "Urgent action required to strengthen short-term financial position.",
            "actions": [
                "Secure line of credit or working capital financing",
                "Delay non-essential capital expenditures",
                "Consider asset-light business model adjustments",
                "Explore strategic partnerships or funding options"
            ],
            "expectedImpact": "Improve current ratio to >1.5"
        })
    
    return recommendations


def generate_risk_assessment(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate risk assessment"""
    risks = []
    
    # Profitability risk
    if context.get('profitability') == 'low':
        risks.append({
            "level": "high",
            "category": "Profitability Risk",
            "description": "Low or negative profit margins threaten long-term viability",
            "mitigation": "Implement margin improvement initiatives and monitor break-even point closely"
        })
    
    # Liquidity risk
    if context.get('liquidity') == 'weak':
        risks.append({
            "level": "critical",
            "category": "Liquidity Risk",
            "description": "Insufficient current assets to cover short-term obligations",
            "mitigation": "Secure additional financing, improve collections, and extend payables where possible"
        })
    
    # Leverage risk
    if context.get('debt_to_equity', 0) > 2.0:
        risks.append({
            "level": "high",
            "category": "Financial Leverage Risk",
            "description": "High debt levels increase financial risk and limit flexibility",
            "mitigation": "Focus on debt reduction, improve cash generation, and avoid additional leverage"
        })
    
    # Operational risk
    if 'gross_margin' in context and 'operating_margin' in context:
        if context['gross_margin'] - context['operating_margin'] > 40:
            risks.append({
                "level": "medium",
                "category": "Operational Efficiency Risk",
                "description": "High operating expenses consuming gross profit",
                "mitigation": "Review cost structure, implement efficiency programs, and benchmark against industry"
            })
    
    # Growth sustainability risk
    if context.get('cash_generation') == 'negative' and context.get('liquidity') != 'strong':
        risks.append({
            "level": "high",
            "category": "Growth Sustainability Risk",
            "description": "Negative cash flow combined with limited liquidity constrains growth",
            "mitigation": "Prioritize cash-generative activities and consider external financing for growth initiatives"
        })
    
    return risks


def generate_next_steps(context: Dict[str, Any]) -> List[str]:
    """Generate actionable next steps"""
    steps = [
        "Review and validate all financial data for accuracy and completeness",
        "Share this analysis with key stakeholders and leadership team",
    ]
    
    if context.get('profitability') == 'low':
        steps.append("Conduct detailed profitability analysis by product/service line")
        steps.append("Develop 90-day profitability improvement plan")
    
    if context.get('liquidity') == 'weak':
        steps.append("Create weekly cash flow forecast for next 13 weeks")
        steps.append("Schedule meeting with bank/lenders to discuss financing options")
    
    if context.get('cash_generation') == 'negative':
        steps.append("Analyze and optimize cash conversion cycle metrics (DSO, DIO, DPO)")
    
    steps.extend([
        "Establish monthly financial review cadence with key metrics dashboard",
        "Benchmark performance against industry competitors",
        "Upload additional financial periods to track trends over time"
    ])
    
    return steps


# Helper functions for interpretations
def get_revenue_interpretation(revenue: float) -> str:
    if revenue > 50_000_000:
        return "Enterprise-scale revenue indicating mature market position"
    elif revenue > 10_000_000:
        return "Significant scale achieved with established market presence"
    elif revenue > 1_000_000:
        return "Strong revenue base with growth trajectory"
    else:
        return "Early-stage revenue requiring growth acceleration"

def get_revenue_benchmark(revenue: float) -> str:
    if revenue > 50_000_000:
        return "Top quartile for mid-market companies"
    elif revenue > 10_000_000:
        return "Solid mid-market position"
    else:
        return "Small business / startup scale"

def get_margin_interpretation(margin: float, margin_type: str) -> str:
    thresholds = {
        "gross": {"excellent": 60, "good": 40, "fair": 25},
        "operating": {"excellent": 25, "good": 15, "fair": 5},
        "net": {"excellent": 20, "good": 10, "fair": 5}
    }
    
    t = thresholds.get(margin_type, thresholds["net"])
    
    if margin >= t["excellent"]:
        return f"Excellent {margin_type} margin demonstrating strong efficiency"
    elif margin >= t["good"]:
        return f"Healthy {margin_type} margin with room for optimization"
    elif margin >= t["fair"]:
        return f"Fair {margin_type} margin requiring improvement"
    else:
        return f"Below-average {margin_type} margin needing immediate attention"

def get_liquidity_interpretation(ratio: float) -> str:
    if ratio > 3.0:
        return "Excess liquidity - consider productive deployment of assets"
    elif ratio > 1.5:
        return "Strong liquidity position providing financial flexibility"
    elif ratio > 1.0:
        return "Adequate liquidity but limited buffer for unexpected needs"
    else:
        return "Liquidity concern - current liabilities exceed current assets"

def get_leverage_interpretation(ratio: float) -> str:
    if ratio < 0.5:
        return "Conservative capital structure with minimal leverage"
    elif ratio < 1.5:
        return "Moderate leverage within acceptable range"
    elif ratio < 2.5:
        return "Elevated leverage requiring monitoring"
    else:
        return "High leverage creating financial risk"
    
def merge_kpis_non_destructive(existing: Dict[str, Any], derived: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge derived KPIs without disturbing what already renders.
    Rule: Only fill if existing is truly missing (None or key absent).
    Treat 0 as intentional and keep it.
    """
    out = dict(existing) if existing else {}
    for k, v in (derived or {}).items():
        if k not in out or out[k] is None:
            out[k] = v
    return out

def build_kpis_from_metrics(metrics: Dict[str, Optional[float]]) -> Dict[str, Optional[float]]:
    """
    Build a compact KPI dict. Do NOT silently default missing metrics to 0.
    """
    kpis: Dict[str, Optional[float]] = {}

    rev = metrics.get("revenue")
    cogs = metrics.get("cogs")
    gp  = metrics.get("gross_profit")
    opex = metrics.get("operating_expenses")
    op_inc = metrics.get("operating_income")

    # Derive gross_profit if missing but (rev, cogs) exist
    if gp is None and rev is not None and cogs is not None:
        gp = rev - cogs

    # Compute net income
    net_income = compute_net_income({
        "revenue": rev,
        "cogs": cogs,
        "gross_profit": gp,
        "operating_expenses": opex,
        "operating_income": op_inc,
        "other_income": metrics.get("other_income"),
        "non_operating_income": metrics.get("non_operating_income"),
        "other_expenses": metrics.get("other_expenses"),
        "interest_expense": metrics.get("interest_expense"),
        "taxes": metrics.get("taxes"),
        "depreciation": metrics.get("depreciation"),
        "amortization": metrics.get("amortization"),
        "net_income": metrics.get("net_income"),
    })

    # Margins (guard divide-by-zero and None)
    def pct(num, den):
        if num is None or den in (None, 0):
            return None
        try:
            return float(num) / float(den)
        except ZeroDivisionError:
            return None

    gross_margin = pct(gp, rev)
    operating_margin = pct(op_inc if op_inc is not None else (gp - opex if (gp is not None and opex is not None) else None), rev)
    net_margin = pct(net_income, rev)

    # Log for debugging
    logger.info(
        "🧮 Net income inputs -> rev=%s cogs=%s gp=%s opex=%s other_inc=%s other_exp=%s "
        "interest=%s taxes=%s dep=%s amo=%s",
        rev, cogs, gp, opex, metrics.get("other_income"), metrics.get("other_expenses"),
        metrics.get("interest_expense"), metrics.get("taxes"), metrics.get("depreciation"),
        metrics.get("amortization"),
    )
    logger.info("➡️ Derived net_income=%s (explicit=%s)", net_income, metrics.get("net_income"))

    # Populate KPIs (keep None if unknown — your UI should render 'N/A')
    kpis.update({
        "revenue": rev,
        "cogs": cogs,
        "gross_profit": gp,
        "operating_expenses": opex,
        "operating_income": op_inc if op_inc is not None else (gp - opex if (gp is not None and opex is not None) else None),
        "net_income": net_income,
        "gross_margin": gross_margin,
        "operating_margin": operating_margin,
        "net_margin": net_margin,
    })
    return kpis

# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Main API"}

@router.get("/analysis_summary")
async def analysis_summary(user_id: str = Depends(get_current_user_id)):
    """Return the FULL analysis data for a user"""
    logger.info(f"📊 Analysis request for: {user_id}")
    
    if user_id in analysis_storage:
        data = analysis_storage[user_id]
        logger.info(f"✅ Found data with keys: {list(data.keys())}")
        logger.info(f"📈 kpiChartData length: {len(data.get('kpiChartData', []))}")
        logger.info(f"📊 kpiCardData exists: {bool(data.get('kpiCardData'))}")
        
        return JSONResponse(content=data)
    
    logger.info("⚠️ No analysis data found for user")
    return JSONResponse(
        content={
            "message": "No analysis data found for this user yet. Please upload a file.",
            "hasData": False
        }
    )


def generate_ai_powered_analysis(kpis: Dict[str, Any], doc_type: str, df: pd.DataFrame) -> Dict[str, Any]:
    """
    Use Azure OpenAI to generate comprehensive financial analysis
    """
    try:
        # Prepare context for AI
        context = prepare_analysis_context_for_ai(kpis, doc_type, df)
        
        # Create AI prompt
        prompt = create_financial_analysis_prompt(context)
        
        logger.info("🤖 Calling Azure OpenAI API...")
        
        # Call Azure OpenAI API
        response = client.chat.completions.create(
            model=AZURE_DEPLOYMENT_NAME,  # Your Azure deployment name
            messages=[
                {
                    "role": "system",
                    "content": """You are an expert financial analyst with 20+ years of experience in corporate finance, 
                    investment banking, and business strategy. Provide detailed, actionable insights based on financial data. 
                    Always include specific numbers, percentages, and concrete recommendations."""
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=3000
        )
        
        ai_response = response.choices[0].message.content
        logger.info("✅ Azure OpenAI response received")
        
        # Parse AI response into structured format
        analysis = parse_ai_response(ai_response, kpis, context)
        
        logger.info("✅ AI-powered analysis generated successfully")
        return analysis
        
    except Exception as e:
        logger.error(f"❌ Azure OpenAI analysis failed: {e}")
        logger.info("⚠️ Falling back to rule-based analysis")
        # Fallback to rule-based analysis if AI fails
        return generate_ai_financial_analysis(kpis, doc_type, df)


def prepare_analysis_context_for_ai(kpis: Dict[str, Any], doc_type: str, df: pd.DataFrame) -> Dict[str, Any]:
    """Prepare structured context for AI analysis without zero-defaulting missing KPIs."""
    def pick(d: Dict[str, Any], *keys):
        # Return the first key that exists and is not None; don't coerce to 0.
        for k in keys:
            if k in d and d[k] is not None:
                return d[k]
        return None

    context = {
        "document_type": doc_type,
        "data_points": len(df),
        "columns": df.columns.tolist(),
    }

    # ---- Profit & Loss ----
    if 'profitLoss' in kpis and isinstance(kpis['profitLoss'], dict):
        pl = kpis['profitLoss']
        financials = {
            "revenue":            pick(pl, 'totalRevenue', 'revenue'),
            "gross_profit":       pick(pl, 'grossProfit', 'gross_profit'),
            "gross_margin":       pick(pl, 'grossMargin', 'gross_margin'),
            "operating_income":   pick(pl, 'operatingIncome', 'operating_income'),
            "operating_margin":   pick(pl, 'operatingMargin', 'operating_margin'),
            "net_income":         pick(pl, 'netIncome', 'net_income'),
            "net_margin":         pick(pl, 'netMargin', 'net_margin'),
            "cogs":               pick(pl, 'costOfGoodsSold', 'cogs'),
            "operating_expenses": pick(pl, 'operatingExpenses', 'operating_expenses'),
        }
        # Only add if at least one value is not None
        if any(v is not None for v in financials.values()):
            context['financials'] = financials

    # ---- Balance Sheet ----
    if 'balanceSheet' in kpis and isinstance(kpis['balanceSheet'], dict):
        bs = kpis['balanceSheet']
        balance_sheet = {
            "total_assets":       pick(bs, 'totalAssets', 'total_assets'),
            "current_assets":     pick(bs, 'currentAssets', 'current_assets'),
            "cash":               pick(bs, 'cash', 'cash_and_equivalents'),
            "total_liabilities":  pick(bs, 'totalLiabilities', 'total_liabilities'),
            "current_liabilities":pick(bs, 'currentLiabilities', 'current_liabilities'),
            "total_equity":       pick(bs, 'totalEquity', 'equity'),
            "current_ratio":      pick(bs, 'currentRatio', 'current_ratio'),
            "debt_to_equity":     pick(bs, 'debtToEquity', 'debt_to_equity'),
            "working_capital":    pick(bs, 'workingCapital', 'working_capital'),
        }
        if any(v is not None for v in balance_sheet.values()):
            context['balance_sheet'] = balance_sheet

    # ---- Cash Flow ----
    if 'cashFlow' in kpis and isinstance(kpis['cashFlow'], dict):
        cf = kpis['cashFlow']
        cash_flow = {
            "operating_cash_flow": pick(cf, 'operatingCashFlow', 'operating_cash_flow'),
            "investing_cash_flow": pick(cf, 'investingCashFlow', 'investing_cash_flow'),
            "financing_cash_flow": pick(cf, 'financingCashFlow', 'financing_cash_flow'),
            "free_cash_flow":      pick(cf, 'freeCashFlow', 'free_cash_flow'),
            "capex":               pick(cf, 'capitalExpenditures', 'capex'),
        }
        if any(v is not None for v in cash_flow.values()):
            context['cash_flow'] = cash_flow

    # Optional: sanity log so you can see what the AI will see
    logger.info("🧾 AI context financials: %s", context.get('financials'))
    return context



def create_financial_analysis_prompt(context: Dict[str, Any]) -> str:
    """Create comprehensive prompt for AI analysis with enhanced detail requirements"""

    prompt = f"""You are an expert financial analyst and CFO advisor. Analyze this {context['document_type']} and provide a COMPREHENSIVE, DETAILED financial analysis with specific numbers, percentages, and actionable insights.

FINANCIAL DATA:
"""
    if 'financials' in context:
        f = context['financials']
        prompt += f"""
PROFIT & LOSS METRICS:
- Total Revenue: ${f['revenue']:,.2f}
- Gross Profit: ${f['gross_profit']:,.2f}
- Gross Margin: {f['gross_margin']:.1f}%
- Operating Income: ${f['operating_income']:,.2f}
- Operating Margin: {f['operating_margin']:.1f}%
- Net Income: ${f['net_income']:,.2f}
- Net Margin: {f['net_margin']:.1f}%
- COGS: ${f['cogs']:,.2f}
- Operating Expenses: ${f['operating_expenses']:,.2f}
"""

    if 'balance_sheet' in context:
        bs = context['balance_sheet']
        prompt += f"""
BALANCE SHEET METRICS:
- Total Assets: ${bs['total_assets']:,.2f}
- Current Assets: ${bs['current_assets']:,.2f}
- Cash: ${bs['cash']:,.2f}
- Total Liabilities: ${bs['total_liabilities']:,.2f}
- Current Liabilities: ${bs['current_liabilities']:,.2f}
- Total Equity: ${bs['total_equity']:,.2f}
- Current Ratio: {bs['current_ratio']:.2f}
- Debt-to-Equity: {bs['debt_to_equity']:.2f}
- Working Capital: ${bs['working_capital']:,.2f}
"""

    if 'cash_flow' in context:
        cf = context['cash_flow']
        prompt += f"""
CASH FLOW METRICS:
- Operating Cash Flow: ${cf['operating_cash_flow']:,.2f}
- Investing Cash Flow: ${cf['investing_cash_flow']:,.2f}
- Financing Cash Flow: ${cf['financing_cash_flow']:,.2f}
- Free Cash Flow: ${cf['free_cash_flow']:,.2f}
- CapEx: ${cf['capex']:,.2f}
"""

    prompt += """

CRITICAL REQUIREMENTS FOR YOUR ANALYSIS:
1. Be SPECIFIC with numbers - reference actual dollar amounts and percentages from the data
2. Provide DETAILED explanations (3-5 sentences minimum per insight)
3. Connect the dots between different metrics to tell a coherent financial story
4. Compare to industry standards and best practices
5. Identify both immediate concerns and long-term strategic opportunities
6. Provide ACTIONABLE recommendations with clear implementation steps
7. Use business language that executives can act on

Please provide a detailed analysis in the following JSON format:

{
  "executive_summary": "Write a comprehensive 4-6 paragraph executive summary that:
    - Opens with the company's overall financial health and key performance highlights
    - Analyzes profitability trends with specific margin comparisons
    - Discusses liquidity position and working capital management
    - Examines leverage and capital structure
    - Identifies 2-3 critical areas requiring immediate attention
    - Concludes with strategic outlook and key priorities
    Include specific dollar amounts and percentages throughout.",

  "key_findings": [
    {
      "title": "Revenue Generation Excellence" (example - make these specific and compelling),
      "summary": "Provide 3-4 detailed sentences analyzing this finding. Include:
        - Specific numbers (e.g., 'Revenue of $102,254 represents...')
        - Comparison to benchmarks (e.g., 'This exceeds the industry average of...')
        - Trend analysis (e.g., 'Compared to typical Q2 performance...')
        - Business implications (e.g., 'This indicates strong market positioning because...')",
      "metric_focus": "revenue, gross_margin",
      "severity": "info",
      "recommendation": "Provide a detailed, multi-step recommendation:
        - WHY this action is needed
        - WHAT specific steps to take
        - WHEN to implement
        - EXPECTED outcome with quantified impact",
      "kpi_refs": ["revenue", "gross_margin"]
    },
    {
      "title": "Strong Profitability Performance",
      "summary": "Detailed analysis of profit margins with specific calculations and comparisons...",
      "metric_focus": "net_margin, operating_margin",
      "severity": "info",
      "recommendation": "Detailed recommendation...",
      "kpi_refs": ["net_margin", "operating_margin", "gross_margin"]
    },
    {
      "title": "Excellent Gross Margin",
      "summary": "Deep dive into gross margin performance...",
      "metric_focus": "gross_margin",
      "severity": "info",
      "recommendation": "Specific actions to maintain or improve...",
      "kpi_refs": ["gross_margin", "cogs"]
    },
    {
      "title": "Efficient Operations",
      "summary": "Analysis of operational efficiency...",
      "metric_focus": "operating_margin",
      "severity": "info",
      "recommendation": "Ways to further optimize operations...",
      "kpi_refs": ["operating_margin", "operating_expenses"]
    },
    {
      "title": "Strong Liquidity Position",
      "summary": "Detailed liquidity analysis...",
      "metric_focus": "current_ratio",
      "severity": "info",
      "recommendation": "Working capital optimization strategies...",
      "kpi_refs": ["current_ratio", "working_capital", "cash"]
    },
    {
      "title": "High Leverage" (if debt_to_equity > 3),
      "summary": "Comprehensive leverage analysis with risk assessment...",
      "metric_focus": "debt_to_equity",
      "severity": "warning",
      "recommendation": "Detailed debt management strategy with timeline...",
      "kpi_refs": ["debt_to_equity", "total_liabilities", "total_equity"]
    }
  ],

  "quantitative_insights": [
    {
      "metric": "Net Profit Margin",
      "value": "71.5%",
      "interpretation": "Provide 4-5 sentences explaining:
        - What this exceptional margin indicates about business model
        - How it compares to SaaS industry average (typically 15-25%)
        - What cost structure enables this performance
        - Sustainability analysis
        - Strategic advantages this creates",
      "benchmark": "Industry average: 15-25% for SaaS companies. Top performers: 25-35%. Your company significantly exceeds even top performer benchmarks.",
      "trend": "positive",
      "context": "This margin suggests either premium pricing power, highly efficient operations, or a digital-first business model with minimal COGS. The 71.5% margin is exceptional even for software companies."
    },
    {
      "metric": "Gross Margin",
      "value": "62.5%",
      "interpretation": "Detailed analysis...",
      "benchmark": "Detailed benchmark comparison...",
      "trend": "positive/neutral/negative"
    },
    {
      "metric": "Operating Margin",
      "value": "24.0%",
      "interpretation": "Detailed analysis...",
      "benchmark": "Detailed benchmark comparison...",
      "trend": "positive/neutral/negative"
    },
    {
      "metric": "Current Ratio",
      "value": "5.71",
      "interpretation": "Comprehensive liquidity analysis...",
      "benchmark": "Detailed benchmark with context...",
      "trend": "positive/neutral/negative"
    },
    {
      "metric": "Debt-to-Equity Ratio",
      "value": "8.86",
      "interpretation": "Detailed leverage analysis with implications...",
      "benchmark": "Detailed risk assessment...",
      "trend": "neutral/negative if high"
    }
  ],

  "qualitative_insights": [
    {
      "category": "Business Model Strength",
      "insight": "Write 5-6 sentences providing deep analysis of:
        - What the financial metrics reveal about the business model
        - Competitive advantages evident in the numbers
        - Scalability indicators
        - Market positioning insights
        - Revenue quality assessment
        Include specific references to multiple metrics that support this insight.",
      "implication": "Explain in 3-4 sentences:
        - How this positions the company for future growth
        - Strategic opportunities this creates
        - Potential risks or limitations
        - What management should prioritize based on this insight",
      "supporting_data": "Reference specific metrics: 'Net margin of 71.5%, gross margin of 62.5%, and operating margin of 24.0% collectively indicate...'"
    },
    {
      "category": "Operational Excellence",
      "insight": "Detailed analysis of operational efficiency with specific examples...",
      "implication": "Strategic implications with actionable insights...",
      "supporting_data": "Specific metric references..."
    },
    {
      "category": "Financial Stability",
      "insight": "Comprehensive analysis of financial health and resilience...",
      "implication": "Risk assessment and strategic considerations...",
      "supporting_data": "Multi-metric analysis..."
    },
    {
      "category": "Capital Structure & Leverage",
      "insight": "Detailed analysis of how the company is financed and implications...",
      "implication": "Strategic financing recommendations...",
      "supporting_data": "Balance sheet metric analysis..."
    },
    {
      "category": "Cash Flow & Liquidity",
      "insight": "Deep dive into cash management and working capital efficiency...",
      "implication": "Operational and strategic recommendations...",
      "supporting_data": "Cash flow and liquidity metric analysis..."
    }
  ],

  "strategic_recommendations": [
    {
      "priority": "critical",
      "category": "Debt Management",
      "title": "Implement Comprehensive Debt Reduction Strategy",
      "description": "Write 5-6 sentences providing:
        - Current situation analysis with specific numbers
        - Why this is critical (with risk quantification)
        - Detailed strategic approach
        - Multiple tactical options
        - Success criteria and milestones
        Example: 'With a debt-to-equity ratio of 8.86, significantly above the industry healthy range of 1.5-2.5, the company faces elevated financial risk...'",
      "actions": [
        "Specific Action 1: [Detailed description with timeline and resources needed]",
        "Specific Action 2: [Who owns this, when it should be done]",
        "Specific Action 3: [Measurable outcome and success criteria]",
        "Specific Action 4: [Implementation steps]"
      ],
      "expected_impact": "Quantify the expected outcome: 'Reduce debt-to-equity from 8.86 to 4.5 within 18 months, improving credit rating and reducing interest expense by approximately $X annually'",
      "timeline": "Detailed phased timeline: 'Phase 1 (Months 1-3): Complete analysis and secure refinancing options. Phase 2 (Months 4-12): Execute reduction plan. Phase 3 (Months 13-18): Monitor and optimize'",
      "resources_required": "Specific resource needs: team members, budget, external advisors",
      "risks": "Implementation risks and mitigation strategies"
    },
    {
      "priority": "high",
      "category": "Revenue Growth",
      "title": "Leverage Strong Margins to Fund Growth Initiatives",
      "description": "Detailed strategic recommendation...",
      "actions": ["Detailed action steps..."],
      "expected_impact": "Quantified outcomes...",
      "timeline": "Phased implementation plan...",
      "resources_required": "Specific needs...",
      "risks": "Risk analysis..."
    },
    {
      "priority": "high",
      "category": "Working Capital Optimization",
      "title": "Optimize Excess Liquidity for Strategic Investments",
      "description": "Detailed analysis and recommendation...",
      "actions": ["Specific steps..."],
      "expected_impact": "Expected returns...",
      "timeline": "Implementation schedule...",
      "resources_required": "Required resources...",
      "risks": "Potential risks..."
    },
    {
      "priority": "medium",
      "category": "Cost Optimization",
      "title": "Maintain Operational Efficiency While Scaling",
      "description": "Strategic efficiency recommendations...",
      "actions": ["Detailed actions..."],
      "expected_impact": "Efficiency gains...",
      "timeline": "Rollout plan...",
      "resources_required": "Team and tools needed...",
      "risks": "Execution risks..."
    }
  ],

  "risk_assessment": [
    {
      "level": "high",
      "category": "Financial Leverage Risk",
      "description": "Write 5-6 sentences providing:
        - Detailed risk description with specific numbers
        - How this risk could manifest
        - Potential financial impact
        - Triggering conditions
        - Interconnected risks
        Example: 'The debt-to-equity ratio of 8.86 represents significant financial leverage. In a downturn, even a 15% revenue decline could strain debt servicing...'",
      "probability": "likely/possible/unlikely - with reasoning",
      "impact": "high - with quantified potential losses",
      "mitigation": "Provide 4-5 specific mitigation strategies:
        - Strategy 1 with implementation steps
        - Strategy 2 with timeline
        - Strategy 3 with resource requirements
        - Contingency planning details",
      "indicators": "Specific, measurable early warning signs:
        - 'Current ratio falling below 4.0'
        - 'Operating cash flow declining more than 10% quarter-over-quarter'
        - 'Debt service coverage ratio approaching 2.0'
        - 'Interest expense exceeding 15% of operating income'",
      "monitoring_frequency": "Weekly/Monthly/Quarterly with specific dashboards",
      "responsible_party": "CFO, with Board oversight"
    },
    {
      "level": "medium",
      "category": "Market Concentration Risk",
      "description": "Detailed risk analysis...",
      "probability": "Assessment with reasoning...",
      "impact": "Quantified impact...",
      "mitigation": "Multiple mitigation strategies...",
      "indicators": "Measurable warning signs...",
      "monitoring_frequency": "Recommended frequency...",
      "responsible_party": "Owner..."
    },
    {
      "level": "medium",
      "category": "Operational Scaling Risk",
      "description": "Comprehensive risk assessment...",
      "probability": "Probability analysis...",
      "impact": "Potential consequences...",
      "mitigation": "Detailed mitigation plan...",
      "indicators": "KPIs to monitor...",
      "monitoring_frequency": "Tracking schedule...",
      "responsible_party": "Responsible executive..."
    }
  ],

  "next_steps": [
    "IMMEDIATE (Next 30 days): [Specific action with clear deliverable and owner] - e.g., 'CFO to prepare comprehensive debt analysis including refinancing options, presenting 3 scenarios to Board by [date]'",
    "IMMEDIATE (Next 30 days): [Second critical action] - e.g., 'Finance team to implement enhanced cash flow forecasting with weekly monitoring to track debt service capacity'",
    "SHORT-TERM (30-90 days): [Strategic initiative with milestones] - e.g., 'Launch working capital optimization initiative targeting 10% improvement in cash conversion cycle'",
    "SHORT-TERM (60-90 days): [Another key initiative] - e.g., 'Complete competitive margin analysis and identify 3 opportunities for margin expansion'",
    "MEDIUM-TERM (90-180 days): [Strategic objective] - e.g., 'Develop and begin executing 18-month debt reduction roadmap with quarterly milestones'",
    "MEDIUM-TERM (90-180 days): [Additional objective] - e.g., 'Establish financial dashboard with leading indicators for early risk detection'",
    "LONG-TERM (6-12 months): [Strategic goal] - e.g., 'Achieve debt-to-equity ratio below 5.0 while maintaining current profitability levels'",
    "LONG-TERM (6-12 months): [Vision/goal] - e.g., 'Position company for potential strategic financing or growth capital raise with improved balance sheet metrics'"
  ],

  "scenario_analysis": [
    {
      "scenario": "Base Case",
      "assumptions": "Detailed assumptions about revenue growth, margin maintenance, etc.",
      "financial_impact": "Projected outcomes with specific numbers",
      "probability": "Most likely - 60%",
      "key_drivers": "What makes this the base case"
    },
    {
      "scenario": "Optimistic Case",
      "assumptions": "Growth scenario assumptions",
      "financial_impact": "Upside potential with numbers",
      "probability": "20-25%",
      "key_drivers": "What would drive this outcome"
    },
    {
      "scenario": "Conservative Case",
      "assumptions": "Downside scenario assumptions",
      "financial_impact": "Risk mitigation importance",
      "probability": "15-20%",
      "key_drivers": "Risk factors"
    }
  ]
}

REMEMBER: 
- Every insight should be 4-6 sentences minimum with specific numbers
- Every recommendation should have clear action steps and quantified expected outcomes
- Every risk should include specific indicators and mitigation strategies
- Connect insights across different financial areas to tell a complete story
- Use executive-level business language that drives decision-making
- Be specific, actionable, and comprehensive - this analysis will guide strategic decisions

Your analysis should be thorough enough that an executive could make strategic decisions based solely on your insights.
"""

    return prompt


def parse_ai_response(ai_response: str, kpis: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
    """Parse AI response into structured format"""
    import json
    import re
    
    try:
        # Try to extract JSON from the response
        json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group())
            
            return {
                "overview": parsed.get('executive_summary', ''),
                "quantitative": parsed.get('quantitative_insights', []),
                "qualitative": parsed.get('qualitative_insights', []),
                "recommendations": parsed.get('strategic_recommendations', []),
                "risks": parsed.get('risk_assessment', []),
                "nextSteps": parsed.get('next_steps', []),
                "keyFindings": parsed.get('key_findings', []) or parsed.get('keyFindings', []),
            }
        else:
            # Fallback: structure the text response
            return {
                "overview": ai_response[:1000],  # First 1000 chars as summary
                "quantitative": [],
                "qualitative": [{"category": "AI Analysis", "insight": ai_response, "implication": ""}],
                "recommendations": [],
                "risks": [],
                "nextSteps": []
            }
            
    except Exception as e:
        logger.error(f"Failed to parse AI response: {e}")
        # Return fallback structure
        return generate_ai_financial_analysis(kpis, context['document_type'], None)
    
def debug_dataframe_structure(df: pd.DataFrame, raw_text: str = None):
    """Debug function to inspect DataFrame structure"""
    logger.info("=" * 80)
    logger.info("🔍 DATAFRAME STRUCTURE DEBUG")
    logger.info("=" * 80)
    
    logger.info(f"Shape: {df.shape[0]} rows × {df.shape[1]} columns")
    logger.info(f"Columns: {df.columns.tolist()}")
    
    # Check for unnamed columns
    unnamed_cols = [col for col in df.columns if 'Unnamed' in str(col)]
    if unnamed_cols:
        logger.warning(f"⚠️ Found {len(unnamed_cols)} unnamed columns: {unnamed_cols}")
    
    # Show first few rows
    logger.info("\n📋 First 5 rows:")
    for idx, row in df.head(5).iterrows():
        logger.info(f"  Row {idx}: {row.tolist()}")
    
    # Show column data types
    logger.info("\n📊 Column data types:")
    for col, dtype in df.dtypes.items():
        logger.info(f"  {col}: {dtype}")
    
    # Check for numeric columns
    numeric_cols = df.select_dtypes(include=['int64', 'float64']).columns.tolist()
    logger.info(f"\n🔢 Numeric columns: {numeric_cols}")
    
    # Check raw text if available
    if raw_text:
        logger.info(f"\n📄 Raw text length: {len(raw_text)} characters")
        logger.info(f"First 500 chars:\n{raw_text[:500]}")
    
    logger.info("=" * 80)


# ============================================================================
# HELPER FUNCTIONS FOR ADAPTIVE CHART DATA
# Add these functions BEFORE the @router.post("/upload_and_analyze") endpoint
# ============================================================================

def extract_financial_periods(df: pd.DataFrame) -> List[str]:
    """
    Extract time periods from column headers with better cleaning.
    Returns empty list if only one period exists (will use current values instead).
    """
    periods = []
    
    for col in df.columns[1:]:  # Skip first column (usually labels)
        col_str = str(col).strip()
        
        # Skip if it's an unnamed column
        if col_str.startswith('Unnamed'):
            continue
            
        # Skip if it's empty or just whitespace
        if not col_str or col_str == 'nan':
            continue
        
        # If column has digits, it's likely a period (year, quarter, etc.)
        if any(char.isdigit() for char in col_str):
            periods.append(col_str)
        # Also include columns with month names
        elif any(month in col_str.lower() for month in ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                                                          'jul', 'aug', 'sep', 'oct', 'nov', 'dec']):
            periods.append(col_str)
        # Include columns with quarter indicators
        elif any(q in col_str.lower() for q in ['q1', 'q2', 'q3', 'q4', 'quarter']):
            periods.append(col_str)
    
    # CRITICAL: If we only have 1 or 0 numeric columns, this is a single-period statement
    # Return empty list to signal we should use current KPI values instead
    if len(periods) <= 1:
        logger.info("📅 Single period detected - will use bar chart comparison")
        return []
    
    logger.info(f"📅 Multi-period detected: {periods} - will use line chart")
    return periods


def build_chart_data_from_kpis(kpis: Dict[str, Any], period_name: str = "Current") -> List[Dict[str, Any]]:
    """
    Build bar chart data from KPI values for single-period statements.
    Creates comparative bar charts showing metric-to-metric comparison.
    """
    chart_data = []
    
    # P&L Comparative Bar Chart Data
    if "profitLoss" in kpis:
        pl = kpis["profitLoss"]
        
        revenue = pl.get("totalRevenue", 0)
        cogs = pl.get("costOfGoodsSold", 0)
        operating_expenses = pl.get("operatingExpenses", 0)
        net_income = pl.get("netIncome", 0)
        gross_profit = pl.get("grossProfit", 0)
        
        # Calculate expenses
        total_expenses = abs(cogs) + abs(operating_expenses)
        
        logger.info(f"📊 P&L Bar Chart: Rev=${revenue:,.0f}, Exp=${total_expenses:,.0f}, Net=${net_income:,.0f}")
        
        # Create bar chart data structure
        chart_data.append({
            "period": period_name,
            "chartType": "bar",
            "metrics": [
                {
                    "name": "Revenue",
                    "value": float(revenue),
                    "color": "#10b981"
                },
                {
                    "name": "Expenses",
                    "value": float(total_expenses),
                    "color": "#ef4444"
                },
                {
                    "name": "Gross Profit",
                    "value": float(gross_profit),
                    "color": "#3b82f6"
                },
                {
                    "name": "Net Income",
                    "value": float(net_income),
                    "color": "#8b5cf6"
                }
            ],
            "type": "profitLoss"
        })
    
    # Balance Sheet Comparative Bar Chart Data
    if "balanceSheet" in kpis:
        bs = kpis["balanceSheet"]
        
        assets = bs.get("totalAssets", 0)
        liabilities = bs.get("totalLiabilities", 0)
        equity = bs.get("totalEquity", 0)
        
        logger.info(f"📊 BS Bar Chart: Assets=${assets:,.0f}, Liab=${liabilities:,.0f}, Equity=${equity:,.0f}")
        
        chart_data.append({
            "period": period_name,
            "chartType": "bar",
            "metrics": [
                {
                    "name": "Total Assets",
                    "value": float(assets),
                    "color": "#10b981"
                },
                {
                    "name": "Total Liabilities",
                    "value": float(liabilities),
                    "color": "#ef4444"
                },
                {
                    "name": "Total Equity",
                    "value": float(equity),
                    "color": "#3b82f6"
                }
            ],
            "type": "balanceSheet"
        })
    
    # Cash Flow Comparative Bar Chart Data
    if "cashFlow" in kpis:
        cf = kpis["cashFlow"]
        
        operating_cf = cf.get("operatingCashFlow", 0)
        investing_cf = cf.get("investingCashFlow", 0)
        financing_cf = cf.get("financingCashFlow", 0)
        
        logger.info(f"📊 CF Bar Chart: Op=${operating_cf:,.0f}, Inv=${investing_cf:,.0f}, Fin=${financing_cf:,.0f}")
        
        chart_data.append({
            "period": period_name,
            "chartType": "bar",
            "metrics": [
                {
                    "name": "Operating",
                    "value": float(operating_cf),
                    "color": "#10b981"
                },
                {
                    "name": "Investing",
                    "value": float(investing_cf),
                    "color": "#f59e0b"
                },
                {
                    "name": "Financing",
                    "value": float(financing_cf),
                    "color": "#3b82f6"
                }
            ],
            "type": "cashFlow"
        })
    
    return chart_data


def build_multi_period_chart_data(df: pd.DataFrame, period_columns: List[str], 
                                   kpis: Dict[str, Any], parser: DynamicFinancialParser) -> List[Dict[str, Any]]:
    """
    Build line chart data for multi-period statements showing trends over time.
    """
    chart_data = []
    
    # P&L chart data - Time series format
    if period_columns and "profitLoss" in kpis:
        logger.info(f"📊 Building multi-period P&L line chart for {len(period_columns)} periods")
        
        for period_col in period_columns:
            try:
                col_idx = df.columns.get_loc(period_col)
                temp_parser = DynamicFinancialParser()
                
                revenue = temp_parser.find_line_item_in_dataframe(df, parser.patterns['revenue'], col_idx) or 0
                net_income = temp_parser.find_line_item_in_dataframe(df, parser.patterns['net_income'], col_idx) or 0
                gross_profit = temp_parser.find_line_item_in_dataframe(df, parser.patterns['gross_profit'], col_idx) or 0
                cogs = temp_parser.find_line_item_in_dataframe(df, parser.patterns['cogs'], col_idx) or 0
                operating_expenses = temp_parser.find_line_item_in_dataframe(df, parser.patterns['operating_expenses'], col_idx) or 0
                
                total_expenses = abs(cogs) + abs(operating_expenses)
                if gross_profit == 0 and revenue > 0 and cogs > 0:
                    gross_profit = revenue - cogs
                
                logger.info(f"  {period_col}: Rev=${revenue:,.0f}, Exp=${total_expenses:,.0f}, Net=${net_income:,.0f}")
                
                chart_data.append({
                    "period": period_col,
                    "chartType": "line",
                    "revenue": float(revenue),
                    "expenses": float(total_expenses),
                    "net_income": float(net_income),
                    "gross_profit": float(gross_profit),
                    "predicted": False,
                    "type": "profitLoss"
                })
            except Exception as e:
                logger.warning(f"  ⚠️ Error processing {period_col}: {e}")
                continue

    # Balance Sheet chart data - Time series format
    if period_columns and "balanceSheet" in kpis:
        logger.info(f"📊 Building multi-period Balance Sheet line chart for {len(period_columns)} periods")
        
        for period_col in period_columns:
            try:
                col_idx = df.columns.get_loc(period_col)
                temp_parser = DynamicFinancialParser()
                
                assets = temp_parser.find_line_item_in_dataframe(df, parser.patterns['total_assets'], col_idx) or 0
                liabilities = temp_parser.find_line_item_in_dataframe(df, parser.patterns['total_liabilities'], col_idx) or 0
                equity = temp_parser.find_line_item_in_dataframe(df, parser.patterns['total_equity'], col_idx) or 0
                
                if equity == 0 and assets > 0 and liabilities > 0:
                    equity = assets - liabilities
                
                logger.info(f"  {period_col}: Assets=${assets:,.0f}, Liab=${liabilities:,.0f}, Equity=${equity:,.0f}")
                
                chart_data.append({
                    "period": period_col,
                    "chartType": "line",
                    "total_assets": float(assets),
                    "total_liabilities": float(liabilities),
                    "total_equity": float(equity),
                    "predicted": False,
                    "type": "balanceSheet"
                })
            except Exception as e:
                logger.warning(f"  ⚠️ Error processing {period_col}: {e}")
                continue

    # Cash Flow chart data - Time series format
    if period_columns and "cashFlow" in kpis:
        logger.info(f"📊 Building multi-period Cash Flow line chart for {len(period_columns)} periods")
        
        for period_col in period_columns:
            try:
                col_idx = df.columns.get_loc(period_col)
                temp_parser = DynamicFinancialParser()
                
                operating_cf = temp_parser.find_line_item_in_dataframe(df, parser.patterns['operating_cash_flow'], col_idx) or 0
                investing_cf = temp_parser.find_line_item_in_dataframe(df, parser.patterns['investing_cash_flow'], col_idx) or 0
                financing_cf = temp_parser.find_line_item_in_dataframe(df, parser.patterns['financing_cash_flow'], col_idx) or 0
                
                logger.info(f"  {period_col}: Op=${operating_cf:,.0f}, Inv=${investing_cf:,.0f}, Fin=${financing_cf:,.0f}")
                
                chart_data.append({
                    "period": period_col,
                    "chartType": "line",
                    "operating_cash_flow": float(operating_cf),
                    "investing_cash_flow": float(investing_cf),
                    "financing_cash_flow": float(financing_cf),
                    "predicted": False,
                    "type": "cashFlow"
                })
            except Exception as e:
                logger.warning(f"  ⚠️ Error processing {period_col}: {e}")
                continue
    
    return chart_data


def build_related_explainers(kpis: Dict[str, Any], doc_type: str) -> List[Dict[str, Any]]:
    """
    Build a list of related microlearning explainers based on detected KPIs / doc type.
    This is deliberately simple & deterministic so frontend can just render it.
    """
    explainers: List[Dict[str, Any]] = []

    # Normalize a bit
    doc_type_lower = (doc_type or "").lower()
    has_pl = "profitLoss" in kpis
    has_bs = "balanceSheet" in kpis
    has_cf = "cashFlow" in kpis

    # --- Profit & Loss / Income Statement explainers ---
    if has_pl or "profit & loss" in doc_type_lower or "income statement" in doc_type_lower:
        explainers.append({
            "id": "gross-margin-basics",
            "title": "Understanding Gross Margin",
            "slug": "gross-margin-basics",
            "category": "Profit & Loss",
            "kpi_key": "grossMargin",
            "summary": "What gross margin means, how it’s calculated, and why it matters for pricing and COGS control."
        })
        explainers.append({
            "id": "net-margin-vs-gross-margin",
            "title": "Net Margin vs Gross Margin",
            "slug": "net-margin-vs-gross-margin",
            "category": "Profit & Loss",
            "kpi_key": "netMargin",
            "summary": "How net margin differs from gross margin and what each one tells you about business health."
        })
        explainers.append({
            "id": "operating-margin-playbook",
            "title": "Operating Margin & Cost Structure",
            "slug": "operating-margin-playbook",
            "category": "Profit & Loss",
            "kpi_key": "operatingMargin",
            "summary": "How operating expenses flow through your P&L and how to improve operating margin over time."
        })

    # --- Balance Sheet explainers ---
    if has_bs or "balance sheet" in doc_type_lower:
        explainers.append({
            "id": "current-ratio-101",
            "title": "Current Ratio & Liquidity",
            "slug": "current-ratio-101",
            "category": "Balance Sheet",
            "kpi_key": "currentRatio",
            "summary": "A simple guide to current ratio, what’s a healthy range, and how to improve short-term liquidity."
        })
        explainers.append({
            "id": "debt-to-equity-101",
            "title": "Debt-to-Equity Explained",
            "slug": "debt-to-equity-101",
            "category": "Balance Sheet",
            "kpi_key": "debtToEquity",
            "summary": "What debt-to-equity measures, why high leverage is risky, and how to manage it."
        })
        explainers.append({
            "id": "working-capital-basics",
            "title": "Working Capital Basics",
            "slug": "working-capital-basics",
            "category": "Balance Sheet",
            "kpi_key": "workingCapital",
            "summary": "How working capital is calculated and how it affects your ability to pay bills on time."
        })

    # --- Cash Flow explainers ---
    if has_cf or "cash flow" in doc_type_lower:
        explainers.append({
            "id": "operating-cash-flow-101",
            "title": "Operating Cash Flow",
            "slug": "operating-cash-flow-101",
            "category": "Cash Flow",
            "kpi_key": "operatingCashFlow",
            "summary": "Why cash from operations matters more than accounting profit for day-to-day survival."
        })
        explainers.append({
            "id": "free-cash-flow-101",
            "title": "Free Cash Flow",
            "slug": "free-cash-flow-101",
            "category": "Cash Flow",
            "kpi_key": "freeCashFlow",
            "summary": "How free cash flow is calculated and how it powers growth, debt paydown, or dividends."
        })

    # Fallback: if somehow nothing matched, give a generic starter explainer
    if not explainers:
        explainers.append({
            "id": "financial-statements-overview",
            "title": "3 Core Financial Statements",
            "slug": "financial-statements-overview",
            "category": "Foundations",
            "kpi_key": None,
            "summary": "Quick overview of the Income Statement, Balance Sheet, and Cash Flow Statement and how they connect."
        })

    return explainers


# ============================================================================
# MAIN ENDPOINT - Replace your existing @router.post("/upload_and_analyze")
# ============================================================================

@router.post("/upload_and_analyze")
async def upload_and_analyze(
    file: UploadFile = File(...),
    industry: str = Form("Software/SaaS"),
    user_id: str = Depends(get_current_user_id),
):
    """Enhanced upload and analyze with adaptive chart types (bar for single period, line for multi-period)"""
    logger.info(f"📁 Upload from {user_id}: {file.filename}")
    
    try:
        # Read file content
        content = await file.read()
        logger.info(f"✓ Read {len(content)} bytes")
        ...


        # Read file and get both DataFrame and raw text
        df, raw_text = read_file(content, file.filename)
        logger.info(f"✓ DataFrame loaded: {df.shape}")
        logger.info(f"✓ Columns: {df.columns.tolist()}")

        # Detect statement types
        doc_type = detect_statement_type(df, raw_text)
        logger.info(f"📊 Detected statement type(s): {doc_type}")

        # Enhanced dynamic extraction
        logger.info("🚀 Starting enhanced dynamic financial extraction...")
        parser = DynamicFinancialParser()
        parsed_data = parser.parse_financial_data(df, raw_text)

        # Log what was found
        logger.info(f"✅ Extracted metrics: {list(parsed_data['raw_data'].keys())}")
        logger.info(f"✅ Calculated ratios: {list(parsed_data['ratios'].keys())}")
        
        # Build KPIs from parsed data
        kpis = build_kpis_from_parsed_data(parsed_data, doc_type)
        logger.info(f"✅ Built KPI sections: {list(kpis.keys())}")
        
        # Recalculate operating margin if needed
        if "profitLoss" in kpis:
            pl = kpis["profitLoss"]
            if pl.get("operatingMargin", 0) == 0 and pl.get("totalRevenue", 0) > 0:
                gross_profit = pl.get("grossProfit", 0)
                operating_expenses = pl.get("operatingExpenses", 0)
                revenue = pl.get("totalRevenue", 0)
                
                if gross_profit > 0 and operating_expenses > 0:
                    operating_income = gross_profit - operating_expenses
                    operating_margin = (operating_income / revenue) * 100
                    
                    kpis["profitLoss"]["operatingIncome"] = operating_income
                    kpis["profitLoss"]["operatingMargin"] = operating_margin
                    
                    logger.info(f"✓ Recalculated operating margin: {operating_margin:.2f}%")
        
        # Calculate health score
        health_score = calculate_health_score(kpis)
        logger.info(f"📊 Health Score: {health_score['score']}/100 ({health_score['summary']})")

        # Generate insights
        insights = generate_insights(kpis, doc_type)
        logger.info(f"💡 Generated {len(insights)} insights")
        
        # Generate AI-powered analysis
        logger.info("🤖 Generating AI-powered financial analysis...")
        try:
            ai_analysis = generate_ai_powered_analysis(kpis, doc_type, df)
            logger.info("✅ AI analysis complete")
        except Exception as ai_error:
            logger.warning(f"⚠️ AI analysis failed, using fallback: {ai_error}")
            ai_analysis = generate_ai_financial_analysis(kpis, doc_type, df)

                # --------------------------------------------------------
        # 🔗 Merge engine insights + AI key findings into one list
        # --------------------------------------------------------
        raw_key_findings = (
            ai_analysis.get("keyFindings")
            or ai_analysis.get("key_findings")
            or []
        )

        ai_insight_items = []
        for item in raw_key_findings:
            if isinstance(item, str):
                ai_insight_items.append({
                    "title": "AI Key Finding",
                    "summary": item,
                    "source": "ai",
                    "severity": "info",
                })
            elif isinstance(item, dict):
                ai_insight_items.append({
                    "title": item.get("title") or "AI Key Finding",
                    "summary": (
                        item.get("summary")
                        or item.get("description")
                        or ""
                    ),
                    "metric": item.get("metric_focus")
                              or ", ".join(item.get("kpi_refs", [])) if item.get("kpi_refs") else "",
                    "severity": item.get("severity") or "info",
                    "recommendation": item.get("recommendation") or "",
                    "source": "ai",
                })

        # Combine original rule-based insights + AI findings
        combined_insights = insights + ai_insight_items


        # Build KPI card data dynamically
        kpi_card_data = {}

        if "profitLoss" in kpis:
            pl = kpis["profitLoss"]
            kpi_card_data["profitLoss"] = {
                "total_revenue": {
                    "value": format_currency(pl.get("totalRevenue", 0)),
                    "label": "Total Revenue"
                },
                "gross_profit": {
                    "value": format_currency(pl.get("grossProfit", 0)),
                    "label": "Gross Profit"
                },
                "operating_margin": {
                    "value": f"{pl.get('operatingMargin', 0):.1f}%",
                    "label": "Operating Margin"
                },
                "net_income": {
                    "value": format_currency(pl.get("netIncome", 0)),
                    "label": "Net Income"
                },
            }

        if "balanceSheet" in kpis:
            bs = kpis["balanceSheet"]
            kpi_card_data["balanceSheet"] = {
                "total_assets": {
                    "value": format_currency(bs.get("totalAssets", 0)),
                    "label": "Total Assets"
                },
                "total_liabilities": {
                    "value": format_currency(bs.get("totalLiabilities", 0)),
                    "label": "Total Liabilities"
                },
                "total_equity": {
                    "value": format_currency(bs.get("totalEquity", 0)),
                    "label": "Total Equity"
                },
                "current_ratio": {
                    "value": f"{bs.get('currentRatio', 0):.2f}",
                    "label": "Current Ratio"
                },
            }

        if "cashFlow" in kpis:
            cf = kpis["cashFlow"]
            kpi_card_data["cashFlow"] = {
                "operating_cash_flow": {
                    "value": format_currency(cf.get("operatingCashFlow", 0)),
                    "label": "Operating Cash Flow"
                },
                "investing_cash_flow": {
                    "value": format_currency(cf.get("investingCashFlow", 0)),
                    "label": "Investing Cash Flow"
                },
                "financing_cash_flow": {
                    "value": format_currency(cf.get("financingCashFlow", 0)),
                    "label": "Financing Cash Flow"
                },
                "net_change": {
                    "value": format_currency(cf.get("netChangeInCash", 0)),
                    "label": "Net Change in Cash"
                },
            }

        # ✅ ADAPTIVE CHART DATA GENERATION
        # Extract periods (returns empty list for single-period statements)
        period_columns = extract_financial_periods(df)

        # Build chart data based on whether we have multiple periods or not
        if period_columns:
            # Multi-period statement: Use line charts
            logger.info(f"📊 Multi-period statement detected with {len(period_columns)} periods")
            kpi_chart_data = build_multi_period_chart_data(df, period_columns, kpis, parser)
        else:
            # Single-period statement: Use bar charts
            logger.info(f"📊 Single-period statement detected")
            
            # Try to extract the period name from the document
            period_name = "Current Period"  # Default
            
            if raw_text:
                import re
                # Look for patterns like "June 2025", "Q2 2025", etc.
                period_patterns = [
                    r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}',
                    r'Q[1-4]\s+\d{4}',
                    r'FY\s*\d{4}',
                    r'Year\s+ended?\s+\w+\s+\d+,?\s+\d{4}',
                    r'period\s+ended?\s+\w+\s+\d+,?\s+\d{4}',
                    r'As\s+of\s+\w+\s+\d+,?\s+\d{4}'
                ]
                
                for pattern in period_patterns:
                    match = re.search(pattern, raw_text, re.IGNORECASE)
                    if match:
                        period_name = match.group(0).strip()
                        logger.info(f"📅 Extracted period name: {period_name}")
                        break
            
            # Build single-period bar chart data from KPIs
            kpi_chart_data = build_chart_data_from_kpis(kpis, period_name)

        logger.info(f"✅ Generated {len(kpi_chart_data)} chart data points")
        for point in kpi_chart_data:
            chart_type = point.get('chartType', 'unknown')
            logger.info(f"  📈 {point['type']}: {point['period']} ({chart_type} chart)")
        

         # -------------------------------------------------------------------
        # Build related_explainers list for the frontend MicroLearningSection
        # -------------------------------------------------------------------
        # 1) Prefer whatever the AI pipeline already returned
        related_explainers = parsed_data.get("related_explainers")

        # 2) Fallback: infer from KPI keys if not present
        if not related_explainers:
            related_explainers = []
            try:
                kpi_keys = set()
                if isinstance(kpis, dict):
                    for key in kpis.keys():
                        if isinstance(key, str):
                            kpi_keys.add(key.lower())

                # Simple keyword-based mapping
                if any("gross" in k for k in kpi_keys):
                    related_explainers.append("gross_margin")
                if any("current_ratio" in k or "current ratio" in k for k in kpi_keys):
                    related_explainers.append("current_ratio")
                if any("free cash" in k for k in kpi_keys):
                    related_explainers.append("free_cash_flow")
                if any("ebitda" in k for k in kpi_keys):
                    related_explainers.append("ebitda")
                if any("operating_margin" in k or "operating margin" in k for k in kpi_keys):
                    related_explainers.append("operating_margin")
                if any("debt" in k and "equity" in k for k in kpi_keys):
                    related_explainers.append("debt_to_equity")
            except Exception as e:
                logger.warning(f"⚠️ Failed to infer related_explainers: {e}")
                related_explainers = []

        # Deduplicate while preserving order
        related_explainers = list(dict.fromkeys(related_explainers))

        # Build complete analysis response
        full_analysis = {
            "user_id": user_id,
            "summary": f"Analysis complete for {file.filename}",
            "items": [{
                "filename": file.filename,
                "uploaded_at": datetime.utcnow().isoformat(),
                "size": len(content),
                "type": doc_type
            }],
            "updated_at": datetime.utcnow().isoformat(),
            "company": "Your Company",
            "latestFileName": file.filename,
            "documentType": doc_type,
            "uploadTimestamp": datetime.utcnow().isoformat(),
            "kpiCardData": kpi_card_data,
            "kpis": kpis,
            "health_score": health_score,
            "predictiveAnalysis": {"insights": insights},
            "aiAnalysis": ai_analysis,
            "kpiChartData": kpi_chart_data,
            "extractionMetadata": parsed_data['metadata'],
            "related_explainers": related_explainers, 
        }

        # Store in memory
        analysis_storage[user_id] = full_analysis
        
        logger.info(f"✅ Analysis complete for {user_id}")
        logger.info(f"📊 Chart Data: {len(kpi_chart_data)} points")
        
        # ============== AUTO-RECONCILIATION ==============
        # Auto-run reconciliation after successful upload
        try:
            logger.info("🔄 Running auto-reconciliation...")
            from reconciliation_engine import ReconciliationEngine
            from database import get_db_connection
            
            conn = get_db_connection()
            engine = ReconciliationEngine(conn)
            match_result = engine.auto_match_transactions(user_id)
            conn.close()
            
            # Add reconciliation summary to response
            full_analysis["reconciliation"] = {
                "matches_found": match_result["matches_found"],
                "high_confidence": match_result["high_confidence"],
                "medium_confidence": match_result["medium_confidence"],
                "low_confidence": match_result["low_confidence"],
                "auto_run": True
            }
            logger.info(f"✅ Auto-reconciliation complete: {match_result['matches_found']} matches found")
        except Exception as recon_error:
            logger.warning(f"⚠️ Auto-reconciliation failed (non-critical): {recon_error}")
            # Don't fail the entire upload if reconciliation fails
            full_analysis["reconciliation"] = {
                "auto_run": False,
                "error": str(recon_error)
            }
        # ============== END AUTO-RECONCILIATION ==============
        
        return JSONResponse(content=full_analysis)
    
    except ValueError as ve:
        logger.error(f"❌ Validation error: {ve}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"❌ Analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {str(e)}")
    
@router.get("/test")
async def test_endpoint():
    return {
        "message": "Router working!",
        "storage_users": list(analysis_storage.keys()),
        "storage_count": len(analysis_storage)
    }

@router.post("/clear_storage")
async def clear_storage(user_id: str = Depends(get_current_user_id)):
    """Clear storage for the authenticated user"""
    if user_id in analysis_storage:
        del analysis_storage[user_id]
        logger.info(f"🗑️ Cleared storage for {user_id}")
        return {"message": f"Storage cleared for {user_id}"}
    return {"message": "No data to clear"}


@router.get("/debug_storage")
async def debug_storage(user_id: str):
    """Debug endpoint to see what's stored"""
    if user_id in analysis_storage:
        data = analysis_storage[user_id]
        return {
            "user_id": user_id,
            "has_kpis": bool(data.get('kpis')),
            "has_kpi_card_data": bool(data.get('kpiCardData')),
            "has_kpi_chart_data": bool(data.get('kpiChartData')),
            "chart_data_length": len(data.get('kpiChartData', [])),
            "keys": list(data.keys()),
            "summary": data.get('summary')
        }
    return {"message": "No data found", "storage_keys": list(analysis_storage.keys())}

@router.get("/debug_chart_data")
async def debug_chart_data(user_id: str):
    """Debug endpoint to see exactly what chart data looks like"""
    if user_id in analysis_storage:
        data = analysis_storage[user_id]
        return {
            "kpiChartData": data.get('kpiChartData', []),
            "kpiChartData_length": len(data.get('kpiChartData', [])),
            "first_item": data.get('kpiChartData', [None])[0] if data.get('kpiChartData') else None
        }
    return {"error": "No data found", "available_users": list(analysis_storage.keys())}


@router.post("/test_chart_build")
async def test_chart_build():
    """Test if chart building works"""
    from datetime import datetime
    
    # Fake KPIs
    test_kpis = {
        "profitLoss": {
            "totalRevenue": 102254.3,
            "costOfGoodsSold": 38365.26,
            "grossProfit": 63889.04,
            "operatingExpenses": 39330.78,
            "netIncome": 73070.38
        },
        "balanceSheet": {
            "totalAssets": 1838314.33,
            "totalLiabilities": 1651815.48,
            "totalEquity": 186498.85
        }
    }
    
    # Test building chart data
    period_name = "Test June 2025"
    chart_data = build_chart_data_from_kpis(test_kpis, period_name)
    
    return {
        "success": True,
        "chart_data": chart_data,
        "chart_data_length": len(chart_data),
        "message": "Chart building works!"
    }

@router.post("/reset_user_data")
async def reset_user_data(user_id: str = Depends(get_current_user_id)):
    """
    Complete reset of all user data - use this to start fresh
    """
    logger.info(f"🗑️ COMPLETE RESET requested for user: {user_id}")

    
    # Clear from in-memory storage
    if user_id in analysis_storage:
        del analysis_storage[user_id]
        logger.info(f"   ✓ Removed from analysis_storage")
    
    # Return a completely clean slate response
    clean_response = {
        "user_id": user_id,
        "summary": "All data cleared. Ready for new upload.",
        "items": [],
        "updated_at": None,
        "company": "Your Company",
        "kpiChartData": [],
        "kpiCardData": {},
        "kpis": {},
        "health_score": None,
        "predictiveAnalysis": {"insights": []},
        "aiAnalysis": None,
        "cleared": True,
        "message": "All data has been reset. Upload a document to begin."
    }
    
    logger.info(f"✅ Complete reset successful for {user_id}")
    
    return JSONResponse(content=clean_response)


@router.get("/check_data_status")
async def check_data_status(user_id: str = "anonymous"):
    """
    Check if user has any data stored
    """
    has_data = user_id in analysis_storage
    
    if has_data:
        data = analysis_storage[user_id]
        return {
            "has_data": True,
            "user_id": user_id,
            "items_count": len(data.get('items', [])),
            "last_updated": data.get('updated_at'),
            "document_type": data.get('documentType'),
            "latest_file": data.get('latestFileName'),
            "has_kpis": bool(data.get('kpis')),
            "has_chart_data": bool(data.get('kpiChartData')),
            "chart_data_points": len(data.get('kpiChartData', []))
        }
    else:
        return {
            "has_data": False,
            "user_id": user_id,
            "message": "No data found. Upload a document to begin."
        }


@router.post("/force_clear_all")
async def force_clear_all(confirm: str = Form(...)):
    """
    DANGER: Clear ALL user data - requires confirmation
    Only use this in testing!
    """
    if confirm != "YES_DELETE_ALL":
        raise HTTPException(
            status_code=400, 
            detail="Must provide confirm='YES_DELETE_ALL' to proceed"
        )
    
    logger.warning("⚠️ FORCE CLEARING ALL USER DATA")
    
    # Count before clearing
    user_count = len(analysis_storage)
    users_cleared = list(analysis_storage.keys())
    
    # Clear everything
    analysis_storage.clear()
    
    logger.warning(f"🗑️ Cleared data for {user_count} users: {users_cleared}")
    
    return {
        "success": True,
        "users_cleared": user_count,
        "user_ids": users_cleared,
        "message": "All data has been permanently deleted",
        "warning": "This action cannot be undone"
    }

class CashFlowRequest(BaseModel):
    """Request model for cash flow forecast"""
    current_balance: float = Field(..., description="Current cash balance")
    monthly_revenue: float = Field(..., description="Expected monthly revenue")
    monthly_expenses: float = Field(..., description="Expected monthly expenses")
    receivables: Optional[List[Dict[str, Any]]] = Field(default=[], description="Outstanding invoices")
    payables: Optional[List[Dict[str, Any]]] = Field(default=[], description="Upcoming bills")
    user_id: Optional[str] = None

@router.post("/forecast")
async def forecast_cash_flow(request: CashFlowRequest):
    """
    Generate 90-day cash flow forecast
    
    This is the money-making endpoint that prevents bankruptcy
    """
    try:
        logger.info(f"💰 Cash flow forecast request - Balance: ${request.current_balance:,.0f}")
        
        # Create forecaster
        forecaster = CashFlowForecaster({
            'current_balance': request.current_balance,
            'monthly_revenue': request.monthly_revenue,
            'monthly_expenses': request.monthly_expenses,
            'receivables': request.receivables or [],
            'payables': request.payables or [],
            'historical_transactions': []
        })
        
        # Generate forecast
        forecast = forecaster.forecast_next_90_days()
        
        # Format response
        response = {
            'success': True,
            'forecast': {
                'daily_balances': forecast.daily_balances,
                'alerts': [
                    {
                        'severity': alert.severity,
                        'date': alert.date,
                        'message': alert.message,
                        'action': alert.action,
                        'impact': alert.impact
                    }
                    for alert in forecast.alerts
                ],
                'summary': forecast.summary,
                'recommendations': forecast.recommendations
            }
        }
        
        logger.info(f"✅ Forecast generated - Health score: {forecast.summary['health_score']}/100")
        
        return response
        
    except Exception as e:
        logger.error(f"❌ Forecast failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quick-forecast")
async def quick_cash_flow_forecast(payload: Dict[str, Any] = Body(...)):
    """
    Quick forecast with minimal data
    
    Just give me 3 numbers and I'll tell you if you'll go bankrupt
    """
    try:
        current_balance = payload.get('current_balance', 50000)
        monthly_revenue = payload.get('monthly_revenue', 100000)
        monthly_expenses = payload.get('monthly_expenses', 80000)
        
        logger.info(f"🚀 Quick forecast - Balance: ${current_balance:,.0f}")
        
        result = quick_forecast(current_balance, monthly_revenue, monthly_expenses)
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Quick forecast failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health-check")
async def cash_flow_health_check(
    current_balance: float,
    monthly_expenses: float
):
    """
    Quick health check
    
    Returns simple status: healthy, warning, or critical
    """
    try:
        runway_months = current_balance / monthly_expenses if monthly_expenses > 0 else 999
        
        if runway_months >= 6:
            status = 'healthy'
            message = f"✅ Excellent: {runway_months:.1f} months of runway"
            color = 'green'
        elif runway_months >= 3:
            status = 'caution'
            message = f"⚠️ Caution: {runway_months:.1f} months of runway"
            color = 'yellow'
        elif runway_months >= 1:
            status = 'warning'
            message = f"⚠️ Warning: Only {runway_months:.1f} months of runway"
            color = 'orange'
        else:
            status = 'critical'
            message = f"🚨 CRITICAL: Only {runway_months:.1f} months of runway!"
            color = 'red'
        
        return {
            'status': status,
            'message': message,
            'color': color,
            'runway_months': round(runway_months, 1),
            'runway_days': round(runway_months * 30, 0)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/financial-flow")
async def get_financial_flow(
    user_id: str = Depends(get_current_user_id),
    months: int = 1
):
    """
    Generate Sankey diagram from REAL transaction data
    
    Pulls from your actual ledger_entries and bank_transactions tables
    """
    try:
        logger.info(f"📊 Generating REAL financial flow data for user: {user_id}")
        
        # Import database models
        try:
            from database import SessionLocal
            from models import LedgerEntry, BankTransaction
        except ImportError:
            logger.error("❌ Database models not available")
            return _get_sample_data()
        
        db = SessionLocal()
        
        try:
            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30 * months)
            
            # Get actual ledger entries
            ledger_entries = db.query(LedgerEntry).filter(
                LedgerEntry.user_id == user_id,
                LedgerEntry.date >= start_date,
                LedgerEntry.date <= end_date
            ).all()
            
            logger.info(f"📝 Found {len(ledger_entries)} ledger entries")
            
            # If no data, return empty state
            if not ledger_entries:
                logger.warning("⚠️ No transaction data found")
                return {
                    "success": True,
                    "nodes": [],
                    "links": [],
                    "message": "No transaction data available. Upload financial statements to see cash flow visualization."
                }
            
            # Build nodes and links from REAL data
            nodes, links = _build_sankey_from_ledger(ledger_entries)
            
            logger.info(f"✅ Generated {len(nodes)} nodes and {len(links)} links from real data")
            
            return {
                "success": True,
                "nodes": nodes,
                "links": links,
                "period": {
                    "start": start_date.strftime("%Y-%m-%d"),
                    "end": end_date.strftime("%Y-%m-%d"),
                    "months": months
                },
                "total_transactions": len(ledger_entries)
            }
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Error generating financial flow: {e}", exc_info=True)
        return {
            "success": False,
            "nodes": [],
            "links": [],
            "error": str(e)
        }


def _build_sankey_from_ledger(ledger_entries: List) -> tuple:
    """
    Build Sankey nodes and links from actual ledger entries
    
    Creates flow diagram showing:
    - Revenue sources → Cash Account → Expense categories
    """
    
    # Aggregate by account and category
    inflows = defaultdict(float)   # Revenue categories
    outflows = defaultdict(float)  # Expense categories
    
    for entry in ledger_entries:
        amount = float(entry.amount or 0)
        account = entry.account_name or "Unknown"
        category = entry.category or "Uncategorized"
        
        # Classify as income or expense
        is_income = (
            amount > 0 or 
            'revenue' in account.lower() or 
            'income' in account.lower() or
            'sales' in account.lower() or
            'revenue' in category.lower()
        )
        
        if is_income:
            # This is money coming IN
            key = f"{account}" if account != "Unknown" else category
            inflows[key] += abs(amount)
        else:
            # This is money going OUT
            key = category if category != "Uncategorized" else account
            outflows[key] += abs(amount)
    
    # Build nodes
    nodes = []
    node_map = {}  # name -> index
    
    # Add income nodes
    for income_source in sorted(inflows.keys()):
        if inflows[income_source] > 0:  # Only include non-zero
            idx = len(nodes)
            nodes.append({"name": income_source})
            node_map[income_source] = idx
    
    # Add central cash account node
    cash_account_idx = len(nodes)
    nodes.append({"name": "Cash Account"})
    node_map["Cash Account"] = cash_account_idx
    
    # Add expense nodes
    for expense_category in sorted(outflows.keys()):
        if outflows[expense_category] > 0:  # Only include non-zero
            idx = len(nodes)
            nodes.append({"name": expense_category})
            node_map[expense_category] = idx
    
    # Build links
    links = []
    
    # Income sources → Cash Account
    for income_source, amount in inflows.items():
        if amount > 0:
            links.append({
                "source": node_map[income_source],
                "target": cash_account_idx,
                "value": round(amount, 2)
            })
    
    # Cash Account → Expenses
    for expense_category, amount in outflows.items():
        if amount > 0:
            links.append({
                "source": cash_account_idx,
                "target": node_map[expense_category],
                "value": round(amount, 2)
            })
    
    return nodes, links


def _get_sample_data():
    """Fallback sample data if database not available"""
    return {
        "success": True,
        "nodes": [
            {"name": "Revenue"},
            {"name": "Cash Account"},
            {"name": "Expenses"}
        ],
        "links": [
            {"source": 0, "target": 1, "value": 100000},
            {"source": 1, "target": 2, "value": 80000}
        ],
        "message": "Sample data - database not configured"
    }


@router.post("/quick-forecast")
async def quick_cash_flow_forecast(
    payload: Dict[str, Any] = Body(...),
    user_id: str = Depends(get_current_user_id)
):
    """
    Quick cash flow forecast using REAL financial data
    """
    try:
        logger.info(f"🚀 Quick forecast for user: {user_id}")
        
        # Get values from payload OR fetch from database
        current_balance = payload.get('current_balance')
        monthly_revenue = payload.get('monthly_revenue')
        monthly_expenses = payload.get('monthly_expenses')
        
        # If not provided, try to get from database
        if not all([current_balance, monthly_revenue, monthly_expenses]):
            try:
                from database import SessionLocal
                from models import LedgerEntry
                
                db = SessionLocal()
                
                try:
                    # Calculate from last 30 days of data
                    end_date = datetime.now()
                    start_date = end_date - timedelta(days=30)
                    
                    entries = db.query(LedgerEntry).filter(
                        LedgerEntry.user_id == user_id,
                        LedgerEntry.date >= start_date
                    ).all()
                    
                    total_revenue = sum(abs(float(e.amount)) for e in entries if float(e.amount or 0) > 0)
                    total_expenses = sum(abs(float(e.amount)) for e in entries if float(e.amount or 0) < 0)
                    
                    monthly_revenue = monthly_revenue or total_revenue
                    monthly_expenses = monthly_expenses or total_expenses
                    current_balance = current_balance or 50000  # Default if not in DB
                    
                    logger.info(f"📊 Calculated from DB - Revenue: ${monthly_revenue:,.0f}, Expenses: ${monthly_expenses:,.0f}")
                    
                finally:
                    db.close()
                    
            except Exception as e:
                logger.warning(f"⚠️ Could not fetch from DB: {e}")
                # Use payload values or defaults
                current_balance = current_balance or 50000
                monthly_revenue = monthly_revenue or 100000
                monthly_expenses = monthly_expenses or 80000
        
        # Generate forecast
        daily_forecast = []
        balance = current_balance
        
        for day in range(1, 91):  # 90 days
            daily_revenue = monthly_revenue / 30
            daily_expenses = monthly_expenses / 30
            balance += (daily_revenue - daily_expenses)
            
            status = 'healthy' if balance > monthly_expenses * 0.5 else 'warning' if balance > 0 else 'critical'
            
            daily_forecast.append({
                'day_number': day,
                'date': (datetime.now() + timedelta(days=day)).strftime('%Y-%m-%d'),
                'closing_balance': round(balance, 2),
                'inflow': round(daily_revenue, 2),
                'outflow': round(daily_expenses, 2),
                'status': status
            })
        
        # Calculate summary
        lowest_balance = min(d['closing_balance'] for d in daily_forecast)
        runway_months = current_balance / monthly_expenses if monthly_expenses > 0 else 999
        health_score = 100 if runway_months > 6 else 75 if runway_months > 3 else 50 if runway_months > 1 else 25
        
        # Generate alerts
        alerts = []
        if runway_months < 1:
            alerts.append({
                'severity': 'critical',
                'date': daily_forecast[0]['date'],
                'message': f'🚨 CRITICAL: Only {runway_months:.1f} months of runway',
                'action': 'Secure emergency funding immediately',
                'impact': current_balance
            })
        elif runway_months < 3:
            alerts.append({
                'severity': 'warning',
                'date': daily_forecast[0]['date'],
                'message': f'⚠️ WARNING: Only {runway_months:.1f} months of runway',
                'action': 'Start fundraising conversations now',
                'impact': monthly_expenses * 3 - current_balance
            })
        
        # Check for negative balance in forecast
        for day in daily_forecast:
            if day['closing_balance'] < 0:
                alerts.append({
                    'severity': 'critical',
                    'date': day['date'],
                    'message': f'🚨 Cash will be negative on {day["date"]}',
                    'action': 'Invoice customers early or delay payments',
                    'impact': abs(day['closing_balance'])
                })
                break
        
        result = {
            'success': True,
            'current_balance': current_balance,
            'daily_forecast': daily_forecast,
            'alerts': alerts,
            'summary': {
                'current_balance': current_balance,
                'lowest_balance': lowest_balance,
                'lowest_balance_date': min(daily_forecast, key=lambda x: x['closing_balance'])['date'],
                'runway_months': round(runway_months, 1),
                'monthly_burn_rate': monthly_expenses,
                'health_score': health_score,
                'total_inflow_30days': monthly_revenue,
                'total_outflow_30days': monthly_expenses,
                'net_change_30days': monthly_revenue - monthly_expenses
            },
            'recommendations': _generate_recommendations(runway_months, monthly_revenue, monthly_expenses)
        }
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Quick forecast failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def _generate_recommendations(runway_months: float, monthly_revenue: float, monthly_expenses: float) -> List[str]:
    """Generate smart recommendations based on actual data"""
    
    recommendations = []
    
    if runway_months < 3:
        recommendations.append(f"🚨 CRITICAL: Only {runway_months:.1f} months of runway")
        recommendations.append("• Start fundraising conversations immediately")
        recommendations.append("• Cut non-essential expenses by 20%")
        recommendations.append("• Accelerate invoice collection")
    elif runway_months < 6:
        recommendations.append(f"⚠️ WARNING: {runway_months:.1f} months of runway")
        recommendations.append("• Build cash reserves to 6+ months")
        recommendations.append("• Review and optimize expenses")
    else:
        recommendations.append(f"✅ Healthy: {runway_months:.1f} months of runway")
        recommendations.append("• Maintain current practices")
    
    # Revenue vs Expenses
    net_monthly = monthly_revenue - monthly_expenses
    if net_monthly < 0:
        recommendations.append(f"📉 Burning ${abs(net_monthly):,.0f}/month - path to profitability needed")
    else:
        recommendations.append(f"📈 Generating ${net_monthly:,.0f}/month positive cash flow")
    
    return recommendations


@router.get("/health")
async def health_check():
    """Check if cash flow service is running"""
    return {
        "status": "healthy",
        "service": "cash-flow",
        "version": "1.0.0",
        "data_source": "real",
        "endpoints": [
            "/financial-flow",
            "/quick-forecast",
            "/health"
        ]
    }
