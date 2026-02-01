
import sys
import os

# Добавляем путь к корню проекта, чтобы импортировать app
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.utils.title_generator import generate_seo_title

class MockSettlement:
    def __init__(self, name, city=False):
        self.name = name
        self.city = city
        
class MockPlot:
    def __init__(self, price_public):
        self.price_public = price_public
        self.status = 'active'

class MockListing:
    def __init__(self, area, price, settlement=None, plots=None):
        self.total_area = area
        self.price_public = price
        self.settlement = settlement
        self.plots = plots or []
        self.settlement_id = 1 if settlement else None

def run_tests():
    test_cases = [
        # 1. Стандартный кейс
        {
            "name": "Standard Case",
            "listing": MockListing(1000, 399000, MockSettlement("Лунино")),
            "expected": "Участок 10 сот. — п. Лунино, Калининградская обл., 399 000 ₽ | РКК земля"
        },
        # 2. Дробная площадь
        {
            "name": "Fractional Area",
            "listing": MockListing(650, 1200000, MockSettlement("Гурьевск", city=True)),
            "expected": "Участок 6.5 сот. — г. Гурьевск, Калининградская обл., 1.2 млн ₽ | РКК земля"
        },
        # 3. Цена в миллионах (ровно)
        {
            "name": "Price millions exact",
            "listing": MockListing(1000, 1000000, MockSettlement("Родники")),
            "expected": "Участок 10 сот. — п. Родники, Калининградская обл., 1 млн ₽ | РКК земля"
        },
         # 4. Цена в миллионах (с дробью)
        {
            "name": "Price millions fractional",
            "listing": MockListing(1200, 1150000, MockSettlement("Родники")),
            "expected": "Участок 12 сот. — п. Родники, Калининградская обл., 1.15 млн ₽ | РКК земля"
        },
        # 5. Нет цены в листинге, но есть в участках
        {
            "name": "Price from plots",
            "listing": MockListing(800, 0, MockSettlement("Матросово"), plots=[MockPlot(500000)]),
            "expected": "Участок 8 сот. — п. Матросово, Калининградская обл., 500 000 ₽ | РКК земля"
        },
        # 6. Нет цены вообще
        {
            "name": "No price",
            "listing": MockListing(800, 0, MockSettlement("Матросово")),
            "expected": "Участок 8 сот. — п. Матросово, Калининградская обл. | РКК земля"
        },
        # 7. Длинное название поселка
        {
            "name": "Long settlement name",
            "listing": MockListing(1000, 300000, MockSettlement("Поселок с очень длинным названием которое не влезает")),
            "expected": "Участок 10 сот. — п. Поселок с очень длинным наз..., Калининградская обл., 300 000 ₽ | РКК земля"
        },
        # 8. Нет поселка (Fallback)
        {
            "name": "No settlement",
            "listing": MockListing(1000, 300000, None),
            "expected": "Участок 10 сот. — Калининградская обл., Калининградская обл., 300 000 ₽ | РКК земля"
        },
    ]

    print(f"{'TEST NAME':<30} | {'STATUS':<6} | {'RESULT'}")
    print("-" * 100)
    
    failed = False
    for case in test_cases:
        actual = generate_seo_title(case["listing"])
        is_passed = actual == case["expected"]
        status = "PASS" if is_passed else "FAIL"
        if not is_passed:
            failed = True
        
        print(f"{case['name']:<30} | {status:<6} | {actual}")
        if not is_passed:
             print(f"{'':<30} | EXPECT | {case['expected']}")
    
    print("-" * 100)
    if failed:
        sys.exit(1)
    else:
        print("All tests passed!")

if __name__ == "__main__":
    run_tests()
