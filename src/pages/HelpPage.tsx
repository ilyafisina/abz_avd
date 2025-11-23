import { useState } from 'react';
import './Pages.css';

export const HelpPage = () => {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const faqs = [
    {
      id: '1',
      category: 'Товары',
      question: 'Как добавить новый товар?',
      answer: 'Перейдите на страницу "Товары", нажмите кнопку "Добавить товар", заполните форму и нажмите "Сохранить".',
    },
    {
      id: '2',
      category: 'Товары',
      question: 'Как отредактировать товар?',
      answer: 'На странице "Товары" найдите нужный товар в таблице и нажмите кнопку "Ред." чтобы отредактировать его.',
    },
    {
      id: '3',
      category: 'Товары',
      question: 'Как удалить товар?',
      answer: 'На странице "Товары" найдите товар и нажмите кнопку "Уд.", затем подтвердите удаление.',
    },
    {
      id: '4',
      category: 'Заявки',
      question: 'Как создать заявку?',
      answer: 'На странице "Заявки" нажмите "Новая заявка", заполните форму и нажмите "Создать".',
    },
    {
      id: '5',
      category: 'Заявки',
      question: 'Как одобрить заявку?',
      answer: 'На странице "Заявки" нажмите на заявку, чтобы открыть детали, затем нажмите "Одобрить".',
    },
    {
      id: '6',
      category: 'Отчёты',
      question: 'Как скачать отчёт?',
      answer: 'На странице "Отчёты" выберите тип отчёта и нажмите "Экспортировать CSV" чтобы скачать файл.',
    },
    {
      id: '7',
      category: 'Отчёты',
      question: 'Как фильтровать товары по категориям?',
      answer: 'На странице "Отчёты" используйте выпадающий список "Категория" для фильтрации товаров.',
    },
    {
      id: '8',
      category: 'Пользователи',
      question: 'Как добавить нового пользователя?',
      answer: 'На странице "Пользователи" нажмите "Добавить пользователя", заполните данные и выберите роль.',
    },
    {
      id: '9',
      category: 'Настройки',
      question: 'Как изменить настройки системы?',
      answer: 'На странице "Настройки" выберите нужную вкладку, измените параметры и нажмите "Сохранить".',
    },
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(new Set(faqs.map(f => f.category)));

  const contactMethods = [
    { type: 'Email', contact: 'support@abz_vad.com', icon: '' },
    { type: 'Телефон', contact: '+7 (999) 123-45-67', icon: '' },
    { type: 'Telegram', contact: '@abz_vad_support', icon: '' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Справка и поддержка</h1>
        <p>Получите помощь и ответы на вопросы</p>
      </div>

      <div className="highlight">
        <p className="no-margin">
          👋 <strong>Добро пожаловать!</strong> Здесь вы найдёте ответы на часто задаваемые вопросы и информацию о том, как использовать систему управления складом.
        </p>
      </div>

      <div className="contact-grid">
        {contactMethods.map((method, idx) => (
          <div key={idx} className="contact-card">
            <div className="contact-icon">{method.icon}</div>
            <p className="muted-small">{method.type}</p>
            <p className="bold">{method.contact}</p>
          </div>
        ))}
      </div>

      <div className="faq-section">
        <h2>🔍 Часто задаваемые вопросы</h2>

        <div className="faq-search">
          <input
            type="text"
            placeholder="Поиск вопросов..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="faq-categories">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSearchTerm(cat)}
              className={`pill ${searchTerm === cat ? 'active' : 'inactive'}`}
            >
              {cat}
            </button>
          ))}
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="pill inactive">✕ Сбросить</button>
          )}
        </div>

        {filteredFaqs.length > 0 ? (
          <div className="faq-list">
            {filteredFaqs.map(faq => (
              <div key={faq.id} className={`faq-item ${expandedFaq === faq.id ? 'expanded' : ''}`}>
                <button
                  onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                  className="faq-btn"
                >
                  <div>
                    <span className="faq-category">{faq.category}</span>
                    <strong>{faq.question}</strong>
                  </div>
                  <span className="faq-arrow">{expandedFaq === faq.id ? '▼' : '▶'}</span>
                </button>
                {expandedFaq === faq.id && (
                  <div className="faq-content">
                    <p className="muted">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>🔍 Вопросы не найдены</p>
          </div>
        )}
      </div>

      <div className="doc-grid">
        <div className="doc-card">
          <h3>📚 Документация</h3>
          <ul className="doc-list">
            <li><a href="#" className="link-accent">Руководство пользователя</a></li>
            <li><a href="#" className="link-accent">Справка по интерфейсу</a></li>
            <li><a href="#" className="link-accent">Видеоуроки</a></li>
            <li><a href="#" className="link-accent">Быстрый старт</a></li>
          </ul>
        </div>

        <div className="doc-card">
          <h3>Техническая помощь</h3>
          <ul className="doc-list">
            <li><a href="#" className="link-accent">Решение проблем</a></li>
            <li><a href="#" className="link-accent">Известные ошибки</a></li>
            <li><a href="#" className="link-accent">Требования системы</a></li>
            <li><a href="#" className="link-accent">История версий</a></li>
          </ul>
        </div>
      </div>

        <div className="tips">
        <h3 className="no-margin">💡 Полезные советы</h3>
        <ul className="tips-list">
          <li>Используйте поиск для быстрого поиска товаров по названию, SKU или месту хранения</li>
          <li>Регулярно проверяйте отчёты о низком запасе чтобы вовремя заказать товары</li>
          <li>Используйте фильтры и сортировку для удобной работы со списками</li>
          <li>Проверяйте журнал логирования для отслеживания всех операций в системе</li>
          <li>Сохраняйте резервные копии данных регулярно</li>
        </ul>
      </div>

      <div className="footer-help">
        <p className="no-margin">
          <strong>Не нашли ответ?</strong> Свяжитесь с нами по одному из контактных способов выше.
        </p>
      </div>
    </div>
  );
};
