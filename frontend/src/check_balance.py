
def count_jsx_balance(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple tag balancer (greedy, doesn't handle self-closing properly in regex but good enough for div)
    import re
    
    # Only look inside <main>
    main_pattern = re.compile(r'<main.*?</main\s*>', re.DOTALL)
    m = main_pattern.search(content)
    if not m:
        print("Could not find <main> block")
        # Fallback to whole file if main is broken
        scope = content
    else:
        scope = m.group(0)
    
    open_tags = re.findall(r'<div', scope)
    close_tags = re.findall(r'</div\s*>', scope)
    
    open_curly = scope.count('{')
    close_curly = scope.count('}')
    
    open_paren = scope.count('(')
    close_paren = scope.count(')')
    
    print(f"File: {filepath}")
    print(f"<div: {len(open_tags)}")
    print(f"</div>: {len(close_tags)}")
    print(f"Difference (div): {len(open_tags) - len(close_tags)}")
    print(f"Curlies: {open_curly} vs {close_curly} (diff: {open_curly - close_curly})")
    print(f"Parens: {open_paren} vs {close_paren} (diff: {open_paren - close_paren})")

count_jsx_balance(r"c:\Projetos\Anti Gravity\Caminho das Cifras\frontend\src\App.jsx")
