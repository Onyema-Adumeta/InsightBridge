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
from fastapi import APIRouter, File, UploadFile, HTTPException, Form, Header
from fastapi.responses import JSONResponse
from datetime import datetime
from typing import Dict, List, Any, Optional

load_dotenv()
logger = logging.getLogger(__name__)
router = APIRouter()


try:

    http_client = httpx.Client(proxies=None)

    client = AzureOpenAI(
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        api_version="2024-02-01",
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        http_client=http_client,
    )
    logger.info("✅ Azure OpenAI client initialized")
except Exception as e:
    logger.warning(f"⚠️ Azure OpenAI not available: {e}")
    client = None  # Set to None so app can still run

AZURE_DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")

# In-memory storage
analysis_storage: Dict[str, Dict] = {}

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
    """Generate actionable insights"""
    insights = []
    
    # Profit & Loss Insights
    if 'profitLoss' in kpis:
        pl = kpis['profitLoss']
        
        # Revenue insights
        revenue = pl.get('totalRevenue', 0)
        if revenue > 1000000:
            insights.append({
                "title": "Significant Revenue Scale",
                "text": f"Revenue of ${revenue:,.0f} shows strong market presence",
                "type": "success"
            })
        elif revenue > 0:
            insights.append({
                "title": "Revenue Generated",
                "text": f"Current revenue at ${revenue:,.0f}",
                "type": "info"
            })
        
        # Profitability insights
        net_margin = pl.get('netMargin', 0)
        if net_margin > 15:
            insights.append({
                "title": "Strong Profitability",
                "text": f"Net margin of {net_margin:.1f}% indicates excellent profit efficiency",
                "type": "success",
                "suggestion": "Maintain pricing discipline and continue cost optimization"
            })
        elif net_margin > 5:
            insights.append({
                "title": "Moderate Profitability",
                "text": f"Net margin of {net_margin:.1f}% is acceptable but has room for improvement",
                "type": "info",
                "suggestion": "Review operating expenses and explore pricing optimization"
            })
        elif net_margin < 0:
            insights.append({
                "title": "Profitability Challenge",
                "text": f"Negative net margin of {net_margin:.1f}% requires immediate attention",
                "type": "danger",
                "suggestion": "Focus on revenue growth and cost reduction initiatives"
            })
        
        # Gross margin insights
        gross_margin = pl.get('grossMargin', 0)
        if gross_margin > 60:
            insights.append({
                "title": "Excellent Gross Margin",
                "text": f"Gross margin of {gross_margin:.1f}% shows strong pricing power",
                "type": "success"
            })
        elif gross_margin < 30:
            insights.append({
                "title": "Low Gross Margin",
                "text": f"Gross margin of {gross_margin:.1f}% may limit profitability",
                "type": "warning",
                "suggestion": "Review pricing strategy and supplier costs"
            })
        
        # Operating efficiency
        operating_margin = pl.get('operatingMargin', 0)
        if operating_margin > 20:
            insights.append({
                "title": "Efficient Operations",
                "text": f"Operating margin of {operating_margin:.1f}% demonstrates operational excellence",
                "type": "success"
            })
        elif operating_margin < 10 and operating_margin > 0:
            insights.append({
                "title": "Operating Efficiency Opportunity",
                "text": f"Operating margin of {operating_margin:.1f}% suggests room for improvement",
                "type": "info",
                "suggestion": "Analyze and optimize operating expenses"
            })
    
    # Balance Sheet Insights
    if 'balanceSheet' in kpis:
        bs = kpis['balanceSheet']
        
        # Liquidity insights
        current_ratio = bs.get('currentRatio', 0)
        if current_ratio < 1.0:
            insights.append({
                "title": "Liquidity Concern",
                "text": f"Current ratio of {current_ratio:.2f} suggests potential cash flow issues",
                "type": "danger",
                "suggestion": "Focus on accelerating collections and managing payables"
            })
        elif current_ratio > 2.0:
            insights.append({
                "title": "Strong Liquidity Position",
                "text": f"Current ratio of {current_ratio:.2f} - current assets comfortably cover obligations",
                "type": "success"
            })
        elif current_ratio >= 1.5:
            insights.append({
                "title": "Healthy Liquidity",
                "text": f"Current ratio of {current_ratio:.2f} indicates good short-term financial health",
                "type": "success"
            })
        
        # Debt insights
        debt_to_equity = bs.get('debtToEquity', 0)
        if debt_to_equity > 2.0:
            insights.append({
                "title": "High Leverage",
                "text": f"Debt-to-equity ratio of {debt_to_equity:.2f} indicates significant leverage",
                "type": "warning",
                "suggestion": "Consider debt reduction strategies to lower financial risk"
            })
        elif debt_to_equity < 0.5:
            insights.append({
                "title": "Conservative Capital Structure",
                "text": f"Low debt-to-equity ratio of {debt_to_equity:.2f} shows financial stability",
                "type": "success"
            })
        
        # Working capital
        working_capital = bs.get('workingCapital', 0)
        if working_capital < 0:
            insights.append({
                "title": "Negative Working Capital",
                "text": "Current liabilities exceed current assets",
                "type": "danger",
                "suggestion": "Improve cash collection and reduce short-term obligations"
            })
    
    # Cash Flow Insights
    if 'cashFlow' in kpis:
        cf = kpis['cashFlow']
        
        # Operating cash flow
        operating_cf = cf.get('operatingCashFlow', 0)
        if operating_cf > 0:
            insights.append({
                "title": "Positive Operating Cash Flow",
                "text": f"Generating ${abs(operating_cf):,.0f} from operations",
                "type": "success"
            })
        else:
            insights.append({
                "title": "Negative Operating Cash Flow",
                "text": "Operations are consuming cash",
                "type": "danger",
                "suggestion": "Focus on improving cash conversion cycle"
            })
        
        # Free cash flow
        free_cf = cf.get('freeCashFlow', 0)
        if free_cf < 0:
            insights.append({
                "title": "Negative Free Cash Flow",
                "text": "Company is spending more than it generates",
                "type": "warning",
                "suggestion": "Review capital expenditures and improve cash conversion cycle"
            })
        elif free_cf > 0:
            insights.append({
                "title": "Positive Free Cash Flow",
                "text": f"Generating ${free_cf:,.0f} in free cash flow",
                "type": "success",
                "suggestion": "Consider reinvestment opportunities or debt reduction"
            })
    
    # If no insights generated, add a default one
    if len(insights) == 0:
        insights.append({
            "title": "Analysis Complete",
            "text": "Financial data processed successfully",
            "type": "info",
            "suggestion": "Upload more financial statements for comprehensive analysis"
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
async def analysis_summary(user_id: str = "anonymous", x_user_id: Optional[str] = Header(None)):
    """Return the FULL analysis data for a user"""
    if x_user_id and user_id == "anonymous":
        user_id = x_user_id

    logger.info(f"📊 Analysis request for: {user_id}")
    
    if user_id in analysis_storage:
        data = analysis_storage[user_id]
        logger.info(f"✅ Found data with keys: {list(data.keys())}")
        logger.info(f"📈 kpiChartData length: {len(data.get('kpiChartData', []))}")
        logger.info(f"📊 kpiCardData exists: {bool(data.get('kpiCardData'))}")
        
        return JSONResponse(content=data)
    
    logger.info(f"⚠️ No data for {user_id}")
    return JSONResponse(content={
        "user_id": user_id,
        "summary": "Welcome to InsightBridge! Upload your first financial document.",
        "items": [],
        "updated_at": None,
        "company": "Your Company",
        "kpiChartData": [],
        "kpiCardData": {}
    })

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
    """Create comprehensive prompt for AI analysis"""
    
    prompt = f"""Analyze this {context['document_type']} and provide a comprehensive financial analysis.

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

Please provide a detailed analysis in the following JSON format:

{
  "executive_summary": "A comprehensive 3-4 paragraph summary analyzing the company's financial position, trends, and strategic outlook. Include specific numbers and percentages.",
  
  "quantitative_insights": [
    {
      "metric": "Metric name",
      "value": "Current value",
      "interpretation": "What this metric tells us about the business",
      "benchmark": "Industry standard or healthy range",
      "trend": "positive/neutral/negative"
    }
  ],
  
  "qualitative_insights": [
    {
      "category": "Category name (e.g., Business Model, Competitive Position)",
      "insight": "Deep insight about this aspect of the business",
      "implication": "What this means for the company's future",
      "supporting_data": "Reference to specific metrics that support this insight"
    }
  ],
  
  "strategic_recommendations": [
    {
      "priority": "critical/high/medium/low",
      "category": "Category (Revenue Growth, Cost Optimization, etc.)",
      "title": "Recommendation title",
      "description": "Detailed explanation",
      "actions": ["Action 1", "Action 2", "Action 3"],
      "expected_impact": "Quantified expected outcome",
      "timeline": "Suggested implementation timeline"
    }
  ],
  
  "risk_assessment": [
    {
      "level": "critical/high/medium/low",
      "category": "Risk category",
      "description": "Detailed risk description",
      "probability": "likely/possible/unlikely",
      "impact": "high/medium/low",
      "mitigation": "Specific mitigation strategies",
      "indicators": "Early warning signs to monitor"
    }
  ],
  
  "next_steps": [
    "Specific, actionable next step 1",
    "Specific, actionable next step 2",
    "Specific, actionable next step 3"
  ]
}

Focus on:
1. Being specific with numbers and percentages
2. Comparing metrics to industry standards
3. Identifying trends and patterns
4. Providing actionable recommendations
5. Highlighting both opportunities and risks
6. Connecting different metrics to tell a story
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
                "nextSteps": parsed.get('next_steps', [])
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


# ============================================================================
# MAIN ENDPOINT - Replace your existing @router.post("/upload_and_analyze")
# ============================================================================

@router.post("/upload_and_analyze")
async def upload_and_analyze(
    file: UploadFile = File(...),
    user_id: str = Form("anonymous"),
    industry: str = Form("Software/SaaS"),
    x_user_id: Optional[str] = Header(None),
):
    """Enhanced upload and analyze with adaptive chart types (bar for single period, line for multi-period)"""
    if x_user_id and user_id == "anonymous":
        user_id = x_user_id

    logger.info(f"📁 Upload from {user_id}: {file.filename}")
    
    try:
        # Read file content
        content = await file.read()
        logger.info(f"✓ Read {len(content)} bytes")

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
            "extractionMetadata": parsed_data['metadata']
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
async def clear_storage(user_id: str = Form(...)):
    """Clear storage for a user"""
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
async def reset_user_data(user_id: str = Form(...)):
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