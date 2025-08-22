/**
 * Advanced Text Normalizer with comprehensive pattern fixing
 */

class AdvancedTextNormalizer {
  constructor() {
    // Comprehensive broken word patterns
    this.brokenWordPatterns = this.buildBrokenWordPatterns();
    this.commonPhrases = this.buildCommonPhrases();
  }

  buildBrokenWordPatterns() {
    // Build comprehensive list of common broken words in transcripts
    return [
      // Common words
      [/\bs\s*o\s*m\s*e\s*t\s*h\s*i\s*n\s*g\b/gi, 'something'],
      [/\be\s*v\s*e\s*r\s*y\s*t\s*h\s*i\s*n\s*g\b/gi, 'everything'],
      [/\bn\s*o\s*t\s*h\s*i\s*n\s*g\b/gi, 'nothing'],
      [/\ba\s*n\s*y\s*t\s*h\s*i\s*n\s*g\b/gi, 'anything'],
      [/\bs\s*o\s*m\s*e\s*o\s*n\s*e\b/gi, 'someone'],
      [/\be\s*v\s*e\s*r\s*y\s*o\s*n\s*e\b/gi, 'everyone'],
      [/\bn\s*o\s*o\s*n\s*e\b/gi, 'no one'],
      [/\ba\s*n\s*y\s*o\s*n\s*e\b/gi, 'anyone'],
      
      // Common verbs
      [/\bu\s*n\s*d\s*e\s*r\s*s\s*t\s*a\s*n\s*d\b/gi, 'understand'],
      [/\br\s*e\s*m\s*e\s*m\s*b\s*e\s*r\b/gi, 'remember'],
      [/\bt\s*o\s*g\s*e\s*t\s*h\s*e\s*r\b/gi, 'together'],
      [/\bi\s*m\s*p\s*o\s*r\s*t\s*a\s*n\s*t\b/gi, 'important'],
      [/\bi\s*n\s*t\s*e\s*r\s*e\s*s\s*t\s*i\s*n\s*g\b/gi, 'interesting'],
      [/\bd\s*i\s*f\s*f\s*e\s*r\s*e\s*n\s*t\b/gi, 'different'],
      [/\bb\s*e\s*c\s*a\s*u\s*s\s*e\b/gi, 'because'],
      [/\bb\s*e\s*f\s*o\s*r\s*e\b/gi, 'before'],
      [/\ba\s*f\s*t\s*e\s*r\b/gi, 'after'],
      [/\bt\s*h\s*r\s*o\s*u\s*g\s*h\b/gi, 'through'],
      [/\ba\s*r\s*o\s*u\s*n\s*d\b/gi, 'around'],
      [/\bb\s*e\s*t\s*w\s*e\s*e\s*n\b/gi, 'between'],
      
      // Technical terms
      [/\bn\s*e\s*u\s*r\s*a\s*l\b/gi, 'neural'],
      [/\bn\s*e\s*t\s*w\s*o\s*r\s*k\b/gi, 'network'],
      [/\bs\s*w\s*a\s*r\s*m\b/gi, 'swarm'],
      [/\ba\s*g\s*e\s*n\s*t\b/gi, 'agent'],
      [/\bs\s*y\s*s\s*t\s*e\s*m\b/gi, 'system'],
      [/\bp\s*r\s*o\s*g\s*r\s*a\s*m\b/gi, 'program'],
      [/\bc\s*o\s*m\s*p\s*u\s*t\s*e\s*r\b/gi, 'computer'],
      [/\bs\s*o\s*f\s*t\s*w\s*a\s*r\s*e\b/gi, 'software'],
      [/\bh\s*a\s*r\s*d\s*w\s*a\s*r\s*e\b/gi, 'hardware'],
      
      // Contractions
      [/\bc\s*a\s*n\s*'\s*t\b/gi, "can't"],
      [/\bw\s*o\s*n\s*'\s*t\b/gi, "won't"],
      [/\bd\s*o\s*n\s*'\s*t\b/gi, "don't"],
      [/\bi\s*t\s*'\s*s\b/gi, "it's"],
      [/\bt\s*h\s*a\s*t\s*'\s*s\b/gi, "that's"],
      [/\bw\s*h\s*a\s*t\s*'\s*s\b/gi, "what's"],
      [/\bt\s*h\s*e\s*r\s*e\s*'\s*s\b/gi, "there's"],
      [/\bh\s*e\s*'\s*s\b/gi, "he's"],
      [/\bs\s*h\s*e\s*'\s*s\b/gi, "she's"],
      [/\bw\s*e\s*'\s*r\s*e\b/gi, "we're"],
      [/\bt\s*h\s*e\s*y\s*'\s*r\s*e\b/gi, "they're"],
      [/\bw\s*e\s*'\s*v\s*e\b/gi, "we've"],
      [/\bi\s*'\s*v\s*e\b/gi, "I've"],
      [/\bt\s*h\s*e\s*y\s*'\s*v\s*e\b/gi, "they've"],
      [/\bi\s*'\s*l\s*l\b/gi, "I'll"],
      [/\bw\s*e\s*'\s*l\s*l\b/gi, "we'll"],
      [/\bt\s*h\s*e\s*y\s*'\s*l\s*l\b/gi, "they'll"],
      [/\bi\s*'\s*d\b/gi, "I'd"],
      [/\bw\s*e\s*'\s*d\b/gi, "we'd"],
      [/\bt\s*h\s*e\s*y\s*'\s*d\b/gi, "they'd"],
      
      // Short common words - be careful with these
      [/\bt\s+h\s+e\b/gi, 'the'],
      [/\ba\s+n\s+d\b/gi, 'and'],
      [/\bf\s+o\s+r\b/gi, 'for'],
      [/\bw\s+i\s+t\s+h\b/gi, 'with'],
      [/\bt\s+h\s+a\s+t\b/gi, 'that'],
      [/\bt\s+h\s+i\s+s\b/gi, 'this'],
      [/\bf\s+r\s+o\s+m\b/gi, 'from'],
      [/\bw\s+h\s+a\s+t\b/gi, 'what'],
      [/\bw\s+h\s+e\s+n\b/gi, 'when'],
      [/\bw\s+h\s+e\s+r\s+e\b/gi, 'where'],
      [/\bt\s+h\s+e\s+r\s+e\b/gi, 'there'],
      [/\bt\s+h\s+e\s+i\s+r\b/gi, 'their'],
      [/\ba\s+b\s+o\s+u\s+t\b/gi, 'about'],
      [/\bw\s+o\s+u\s+l\s+d\b/gi, 'would'],
      [/\bc\s+o\s+u\s+l\s+d\b/gi, 'could'],
      [/\bs\s+h\s+o\s+u\s+l\s+d\b/gi, 'should'],
      [/\bb\s+e\s+e\s+n\b/gi, 'been'],
      [/\bt\s+h\s+e\s+s\s+e\b/gi, 'these'],
      [/\bt\s+h\s+o\s+s\s+e\b/gi, 'those'],
      [/\bo\s+t\s+h\s+e\s+r\b/gi, 'other'],
      [/\ba\s+f\s+t\s+e\s+r\b/gi, 'after'],
      [/\bb\s+e\s+f\s+o\s+r\s+e\b/gi, 'before']
    ];
  }

  buildCommonPhrases() {
    return [
      [/\bi\s+n\s+t\s+e\s+n\s+t\s+s\s+a\s+n\s+d\s+p\s+u\s+r\s+p\s+o\s+s\s+e\s+s\b/gi, 'intents and purposes'],
      [/\bc\s+l\s+o\s+u\s+d\s+f\s+l\s+o\s+w\b/gi, 'Claude Flow'],
      [/\bc\s+l\s+a\s+u\s+d\s+e\s+f\s+l\s+o\s+w\b/gi, 'Claude Flow'],
      [/\bn\s+e\s+u\s+r\s+a\s+l\s+n\s+e\s+t\s+w\s+o\s+r\s+k\b/gi, 'neural network'],
      [/\bm\s+a\s+c\s+h\s+i\s+n\s+e\s+l\s+e\s+a\s+r\s+n\s+i\s+n\s+g\b/gi, 'machine learning'],
      [/\ba\s+r\s+t\s+i\s+f\s+i\s+c\s+i\s+a\s+l\s+i\s+n\s+t\s+e\s+l\s+l\s+i\s+g\s+e\s+n\s+c\s+e\b/gi, 'artificial intelligence']
    ];
  }

  normalize(text, options = {}) {
    if (!text) return '';
    
    let normalized = text;
    
    // Step 1: Fix excessive spacing between characters (aggressive)
    if (options.aggressive !== false) {
      // Fix single letters separated by spaces (but preserve 'a' and 'I' as words)
      normalized = this.fixBrokenWords(normalized);
    }
    
    // Step 2: Apply known broken word patterns
    for (const [pattern, replacement] of this.brokenWordPatterns) {
      normalized = normalized.replace(pattern, replacement);
    }
    
    // Step 3: Apply common phrase patterns
    for (const [pattern, replacement] of this.commonPhrases) {
      normalized = normalized.replace(pattern, replacement);
    }
    
    // Step 4: Fix multiple spaces
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Step 5: Fix punctuation spacing
    normalized = normalized.replace(/\s+([.,!?;:])/g, '$1');
    normalized = normalized.replace(/([.,!?;:])\s*/g, '$1 ');
    normalized = normalized.replace(/([.,!?;:])\s*$/gm, '$1');
    
    // Step 6: Fix sentence capitalization
    normalized = normalized.replace(/(^|\. |\? |! )([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());
    
    // Step 7: Fix common transcription errors
    normalized = this.fixTranscriptionErrors(normalized);
    
    // Step 8: Final cleanup
    normalized = normalized.trim();
    normalized = normalized.replace(/\s+\n/g, '\n');
    normalized = normalized.replace(/\n+/g, '\n');
    normalized = normalized.replace(/\s+/g, ' ');
    
    return normalized;
  }

  fixBrokenWords(text) {
    // Detect and fix words that have been split with spaces
    // This is a more sophisticated approach that looks for patterns
    
    // First pass: fix obvious single-letter sequences
    let fixed = text;
    
    // Look for patterns like "w h e n" or "t h a t"
    // But be careful not to break legitimate sequences
    const words = fixed.split(/\s+/);
    const reconstructed = [];
    let i = 0;
    
    while (i < words.length) {
      const word = words[i];
      
      // Check if this might be start of a broken word
      if (word.length === 1 && /[a-z]/i.test(word)) {
        // Look ahead to see if we have more single letters
        let possibleWord = word;
        let j = i + 1;
        
        while (j < words.length && words[j].length === 1 && /[a-z]/i.test(words[j])) {
          possibleWord += words[j];
          j++;
        }
        
        // Check if the assembled word is likely a real word
        if (possibleWord.length > 2 && this.isLikelyWord(possibleWord)) {
          reconstructed.push(possibleWord);
          i = j;
        } else {
          reconstructed.push(word);
          i++;
        }
      } else {
        reconstructed.push(word);
        i++;
      }
    }
    
    return reconstructed.join(' ');
  }

  isLikelyWord(word) {
    // Simple heuristic to check if assembled letters form a likely word
    const commonWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day',
      'had', 'has', 'his', 'him', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy',
      'did', 'get', 'got', 'let', 'put', 'say', 'she', 'too', 'use', 'that', 'with', 'have', 'this', 'will',
      'your', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come',
      'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'only',
      'year', 'work', 'back', 'call', 'came', 'come', 'each', 'even', 'find', 'give', 'hand', 'high', 'keep',
      'last', 'left', 'life', 'live', 'look', 'made', 'most', 'move', 'must', 'name', 'need', 'next', 'open',
      'part', 'play', 'said', 'same', 'seem', 'show', 'side', 'tell', 'turn', 'used', 'want', 'ways', 'week',
      'went', 'were', 'what', 'word', 'work', 'year', 'about', 'after', 'again', 'along', 'around', 'because',
      'before', 'being', 'between', 'both', 'called', 'could', 'down', 'each', 'first', 'found', 'from',
      'great', 'however', 'into', 'just', 'large', 'little', 'might', 'more', 'most', 'much', 'never', 'number',
      'other', 'people', 'place', 'point', 'right', 'said', 'should', 'small', 'some', 'something', 'state',
      'still', 'such', 'system', 'their', 'then', 'there', 'these', 'they', 'thing', 'think', 'this', 'those',
      'though', 'through', 'under', 'very', 'water', 'where', 'which', 'while', 'with', 'would', 'write',
      'agent', 'swarm', 'neural', 'network', 'claude', 'flow', 'system', 'model', 'train', 'learn'
    ]);
    
    const lowerWord = word.toLowerCase();
    
    // Check if it's a known common word
    if (commonWords.has(lowerWord)) return true;
    
    // Check if it has vowels (most English words do)
    if (!/[aeiou]/i.test(word)) return false;
    
    // Check if it has reasonable consonant clusters
    if (/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(word)) return false;
    
    // If it's 4+ letters with vowels, probably a word
    return word.length >= 4;
  }

  fixTranscriptionErrors(text) {
    let fixed = text;
    
    // Fix common transcription errors
    fixed = fixed.replace(/\bi\s+i\b/gi, 'I');
    fixed = fixed.replace(/\bl\s+'/gi, "I'");
    fixed = fixed.replace(/\bi\s+t\s+'/gi, "it'");
    fixed = fixed.replace(/\bs\s+o\s+r\s+t\s+o\s+f\b/gi, 'sort of');
    fixed = fixed.replace(/\bk\s+i\s+n\s+d\s+o\s+f\b/gi, 'kind of');
    fixed = fixed.replace(/\ba\s+l\s+o\s+t\s+o\s+f\b/gi, 'a lot of');
    fixed = fixed.replace(/\bg\s+o\s+i\s+n\s+g\s+t\s+o\b/gi, 'going to');
    fixed = fixed.replace(/\bw\s+a\s+n\s+t\s+t\s+o\b/gi, 'want to');
    fixed = fixed.replace(/\bh\s+a\s+v\s+e\s+t\s+o\b/gi, 'have to');
    fixed = fixed.replace(/\bu\s+s\s+e\s+d\s+t\s+o\b/gi, 'used to');
    fixed = fixed.replace(/\ba\s+b\s+l\s+e\s+t\s+o\b/gi, 'able to');
    
    return fixed;
  }
}

module.exports = AdvancedTextNormalizer;