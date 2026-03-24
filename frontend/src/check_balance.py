import re
import sys

def check_jsx_balance(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove comments
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    content = re.sub(r'//.*', '', content)

    # Remove strings
    content = re.sub(r"'(?:\\.|[^'])*'", "''", content)
    content = re.sub(r'"(?:\\.|[^"])*"', '""', content)
    content = re.sub(r'`(?:\\.|[^`])*?`', '``', content, flags=re.DOTALL)

    # Stack for tags
    stack = []
    
    # Combined regex for tags and self-closing tags
    # <tag ... > or </tag>
    tag_re = re.compile(r'<(/?)([a-zA-Z0-9.-]+)(?:\s+[^>]*?)?(/?)\s*>')
    
    lines = content.split('\n')
    for i, line in enumerate(lines):
        for match in tag_re.finditer(line):
            is_close = match.group(1) == '/'
            tag_name = match.group(2)
            is_self_closing = match.group(3) == '/'
            
            if is_self_closing:
                continue
            
            if is_close:
                if not stack:
                    print(f"Extra closing tag </{tag_name}> at line {i+1}")
                else:
                    last_tag, last_line = stack.pop()
                    if last_tag != tag_name:
                        print(f"Mismatched tag: expected </{last_tag}> (from line {last_line}), found </{tag_name}> at line {i+1}")
            else:
                stack.append((tag_name, i + 1))

    if stack:
        print("Unclosed tags at end of file:")
        for tag, line in stack:
            print(f"<{tag}> opened at line {line}")
    else:
        print("JSX tags are balanced!")

if __name__ == "__main__":
    check_jsx_balance(sys.argv[1])
