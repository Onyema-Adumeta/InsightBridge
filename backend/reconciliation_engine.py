# backend/reconciliation_engine.py
"""
Auto-Reconciliation Engine
Matches bank transactions to ledger entries using multiple strategies
"""

from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
import pyodbc
from difflib import SequenceMatcher
import re
import logging

logger = logging.getLogger(__name__)

class ReconciliationEngine:
    def __init__(self, db_connection):
        self.conn = db_connection
        
    def auto_match_transactions(self, user_id: str) -> Dict:
        """
        Main entry point for auto-reconciliation
        Returns summary of matches found
        """
        try:
            # Get unmatched bank transactions
            bank_transactions = self._get_unmatched_bank_transactions(user_id)
            logger.info(f"Found {len(bank_transactions)} unmatched bank transactions")
            
            # Get unmatched ledger entries
            ledger_entries = self._get_unmatched_ledger_entries(user_id)
            logger.info(f"Found {len(ledger_entries)} unmatched ledger entries")
            
            # Run matching algorithms
            matches = []
            for bank_txn in bank_transactions:
                best_match = self._find_best_match(bank_txn, ledger_entries, user_id)
                if best_match:
                    matches.append(best_match)
            
            # Save matches to database
            self._save_matches(matches, user_id)
            
            # Return summary
            return {
                "total_bank_transactions": len(bank_transactions),
                "total_ledger_entries": len(ledger_entries),
                "matches_found": len(matches),
                "high_confidence": len([m for m in matches if m['confidence'] >= 90]),
                "medium_confidence": len([m for m in matches if 70 <= m['confidence'] < 90]),
                "low_confidence": len([m for m in matches if m['confidence'] < 70]),
            }
        except Exception as e:
            logger.error(f"Auto-match failed: {e}")
            raise
    
    def _get_unmatched_bank_transactions(self, user_id: str) -> List[Dict]:
        """Fetch unmatched bank transactions from database"""
        cursor = self.conn.cursor()
        query = """
        SELECT id, transaction_date, description, amount, transaction_type, bank_reference
        FROM bank_transactions
        WHERE user_id = ? AND matched = 0
        ORDER BY transaction_date DESC
        """
        cursor.execute(query, (user_id,))
        
        transactions = []
        for row in cursor.fetchall():
            transactions.append({
                'id': row[0],
                'date': row[1],
                'description': row[2],
                'amount': float(row[3]),
                'type': row[4],
                'reference': row[5]
            })
        
        return transactions
    
    def _get_unmatched_ledger_entries(self, user_id: str) -> List[Dict]:
        """Fetch unmatched ledger entries from database"""
        cursor = self.conn.cursor()
        query = """
        SELECT id, entry_date, description, amount, account_code, vendor_name
        FROM ledger_entries
        WHERE user_id = ? AND matched = 0
        ORDER BY entry_date DESC
        """
        cursor.execute(query, (user_id,))
        
        entries = []
        for row in cursor.fetchall():
            entries.append({
                'id': row[0],
                'date': row[1],
                'description': row[2],
                'amount': float(row[3]),
                'account_code': row[4],
                'vendor_name': row[5]
            })
        
        return entries
    
    def _find_best_match(self, bank_txn: Dict, ledger_entries: List[Dict], 
                        user_id: str) -> Optional[Dict]:
        """
        Find the best matching ledger entry for a bank transaction
        Returns match with confidence score and reason
        """
        best_match = None
        best_score = 0
        best_reason = ""
        
        for ledger in ledger_entries:
            score, reason = self._calculate_match_score(bank_txn, ledger, user_id)
            
            if score > best_score and score >= 50:  # Minimum 50% confidence
                best_score = score
                best_match = ledger
                best_reason = reason
        
        if best_match:
            return {
                'bank_transaction_id': bank_txn['id'],
                'ledger_entry_id': best_match['id'],
                'confidence': best_score,
                'reason': best_reason
            }
        
        return None
    
    def _calculate_match_score(self, bank_txn: Dict, ledger: Dict, 
                               user_id: str) -> Tuple[float, str]:
        """
        Calculate match confidence score using multiple factors
        Returns (score, reason) tuple
        """
        score = 0
        reasons = []
        
        # 1. EXACT AMOUNT MATCH (40 points)
        if abs(bank_txn['amount'] - ledger['amount']) < 0.01:
            score += 40
            reasons.append("Exact amount match")
        elif abs(bank_txn['amount'] - ledger['amount']) < 10:
            # Close amount (within $10)
            score += 20
            reasons.append("Similar amount")
        
        # 2. DATE PROXIMITY (30 points)
        date_diff = abs((bank_txn['date'] - ledger['date']).days)
        if date_diff == 0:
            score += 30
            reasons.append("Same date")
        elif date_diff <= 3:
            score += 20
            reasons.append(f"Within {date_diff} days")
        elif date_diff <= 7:
            score += 10
            reasons.append(f"Within {date_diff} days")
        
        # 3. DESCRIPTION SIMILARITY (30 points)
        desc_similarity = self._calculate_text_similarity(
            bank_txn['description'],
            ledger['description']
        )
        score += desc_similarity * 30
        if desc_similarity > 0.7:
            reasons.append("Strong description match")
        elif desc_similarity > 0.4:
            reasons.append("Partial description match")
        
        # 4. VENDOR NAME MATCH (bonus 10 points)
        if ledger.get('vendor_name'):
            vendor_similarity = self._calculate_text_similarity(
                bank_txn['description'],
                ledger['vendor_name']
            )
            if vendor_similarity > 0.6:
                score += 10
                reasons.append("Vendor name match")
        
        # 5. LEARNED PATTERNS (bonus points)
        pattern_boost = self._check_learned_patterns(bank_txn, ledger, user_id)
        score += pattern_boost
        if pattern_boost > 0:
            reasons.append("Historical pattern")
        
        # Cap score at 100
        score = min(score, 100)
        
        reason = " | ".join(reasons)
        return (score, reason)
    
    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two text strings"""
        if not text1 or not text2:
            return 0.0
        
        # Normalize text
        text1 = re.sub(r'[^\w\s]', '', text1.lower().strip())
        text2 = re.sub(r'[^\w\s]', '', text2.lower().strip())
        
        # Use SequenceMatcher for fuzzy matching
        return SequenceMatcher(None, text1, text2).ratio()
    
    def _check_learned_patterns(self, bank_txn: Dict, ledger: Dict, 
                                user_id: str) -> float:
        """Check if this match follows learned patterns from user's history"""
        try:
            cursor = self.conn.cursor()
            
            # Check for similar successful matches in the past
            query = """
            SELECT confidence_boost
            FROM matching_rules
            WHERE user_id = ?
            AND pattern LIKE ?
            AND success_rate > 0.7
            """
            
            pattern = f"%{bank_txn['description'][:20]}%"
            cursor.execute(query, (user_id, pattern))
            
            result = cursor.fetchone()
            if result:
                return min(float(result[0]), 15)  # Cap pattern boost at 15 points
        except Exception as e:
            logger.warning(f"Pattern check failed: {e}")
        
        return 0
    
    def _save_matches(self, matches: List[Dict], user_id: str):
        """Save matches to database"""
        cursor = self.conn.cursor()
        
        for match in matches:
            query = """
            INSERT INTO reconciliation_matches 
            (user_id, bank_transaction_id, ledger_entry_id, confidence_score, match_reason, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
            """
            cursor.execute(query, (
                user_id,
                match['bank_transaction_id'],
                match['ledger_entry_id'],
                match['confidence'],
                match['reason']
            ))
        
        self.conn.commit()
        logger.info(f"Saved {len(matches)} matches to database")
    
    def get_pending_matches(self, user_id: str) -> List[Dict]:
        """Get all pending matches for review"""
        cursor = self.conn.cursor()
        query = """
        SELECT 
            rm.id as match_id,
            rm.confidence_score,
            rm.match_reason,
            bt.transaction_date as bank_date,
            bt.description as bank_description,
            bt.amount as bank_amount,
            le.entry_date as ledger_date,
            le.description as ledger_description,
            le.amount as ledger_amount,
            le.vendor_name
        FROM reconciliation_matches rm
        JOIN bank_transactions bt ON rm.bank_transaction_id = bt.id
        JOIN ledger_entries le ON rm.ledger_entry_id = le.id
        WHERE rm.user_id = ? AND rm.status = 'pending'
        ORDER BY rm.confidence_score DESC
        """
        cursor.execute(query, (user_id,))
        
        matches = []
        for row in cursor.fetchall():
            matches.append({
                'match_id': row[0],
                'confidence': float(row[1]),
                'reason': row[2],
                'bank': {
                    'date': row[3].strftime('%Y-%m-%d') if row[3] else None,
                    'description': row[4],
                    'amount': float(row[5])
                },
                'ledger': {
                    'date': row[6].strftime('%Y-%m-%d') if row[6] else None,
                    'description': row[7],
                    'amount': float(row[8]),
                    'vendor': row[9]
                }
            })
        
        return matches
    
    def approve_match(self, match_id: int, user_id: str) -> bool:
        """Mark a match as accepted and update related records"""
        cursor = self.conn.cursor()
        
        try:
            # Get match details
            cursor.execute("""
                SELECT bank_transaction_id, ledger_entry_id
                FROM reconciliation_matches
                WHERE id = ? AND user_id = ?
            """, (match_id, user_id))
            
            result = cursor.fetchone()
            if not result:
                return False
            
            bank_id, ledger_id = result
            
            # Update match status
            cursor.execute("""
                UPDATE reconciliation_matches
                SET status = 'accepted', reviewed_at = GETDATE(), reviewed_by = ?
                WHERE id = ?
            """, (user_id, match_id))
            
            # Mark bank transaction as matched
            cursor.execute("""
                UPDATE bank_transactions
                SET matched = 1
                WHERE id = ?
            """, (bank_id,))
            
            # Mark ledger entry as matched
            cursor.execute("""
                UPDATE ledger_entries
                SET matched = 1
                WHERE id = ?
            """, (ledger_id,))
            
            self.conn.commit()
            logger.info(f"Match {match_id} approved successfully")
            return True
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error approving match: {e}")
            return False
    
    def reject_match(self, match_id: int, user_id: str) -> bool:
        """Mark a match as rejected"""
        cursor = self.conn.cursor()
        
        try:
            cursor.execute("""
                UPDATE reconciliation_matches
                SET status = 'rejected', reviewed_at = GETDATE(), reviewed_by = ?
                WHERE id = ? AND user_id = ?
            """, (user_id, match_id, user_id))
            
            self.conn.commit()
            logger.info(f"Match {match_id} rejected successfully")
            return True
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error rejecting match: {e}")
            return False