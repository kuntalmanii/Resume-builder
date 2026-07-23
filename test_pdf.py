from pypdf import PdfReader

def test_extract_text(pdf_path):
    try:
        # Initialize the PdfReader with your file
        reader = PdfReader(pdf_path)
        full_text = ""
        
        # Loop through every page and extract text
        for page_num, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                full_text += page_text + "\n"
                print(f"--- Successfully read Page {page_num + 1} ---")
            else:
                print(f"⚠️ Warning: Page {page_num + 1} returned no text (might be an image).")
        
        print("\n================ EXTRACTION RESULT ================")
        print(f"Total Character Count: {len(full_text)}")
        print("First 300 characters of your continuous string:")
        print(full_text[:300])
        print("====================================================")
        
    except FileNotFoundError:
        print(f"❌ Error: Could not find '{pdf_path}'. Make sure it is saved in this exact folder!")
    except Exception as e:
        print(f"❌ An error occurred: {e}")

# Testing your specific file
test_extract_text("manish_resume.pdf")