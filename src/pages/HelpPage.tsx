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
    { type: 'Email', contact: 'support@abz_vad.com', icon: '📧' },
    { type: 'Телефон', contact: '+7 (999) 123-45-67', icon: '📞' },
    { type: 'Telegram', contact: '@abz_vad_support', icon: '💬' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>❓ Справка и поддержка</h1>
        <p>Получите помощь и ответы на вопросы</p>
      </div>

      <div style={{ backgroundColor: '#e3f2fd', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
        <p style={{ margin: 0 }}>
          👋 <strong>Добро пожаловать!</strong> Здесь вы найдёте ответы на часто задаваемые вопросы и информацию о том, как использовать систему управления складом.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {contactMethods.map((method, idx) => (
          <div key={idx} style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #eee', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{method.icon}</div>
            <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '12px' }}>{method.type}</p>
            <p style={{ margin: 0, fontWeight: 'bold' }}>{method.contact}</p>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '20px' }}>
        <h2>🔍 Часто задаваемые вопросы</h2>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Поиск вопросов..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSearchTerm(cat)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '20px',
                  backgroundColor: searchTerm === cat ? '#1976d2' : '#f0f0f0',
                  color: searchTerm === cat ? '#fff' : '#000',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                {cat}
              </button>
            ))}
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '20px',
                  backgroundColor: '#f0f0f0',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ✕ Сбросить
              </button>
            )}
          </div>
        </div>

        {filteredFaqs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredFaqs.map(faq => (
              <div
                key={faq.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  backgroundColor: expandedFaq === faq.id ? '#f9f9f9' : '#fff',
                }}
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '12px', color: '#999', marginRight: '8px' }}>📌 {faq.category}</span>
                    <strong>{faq.question}</strong>
                  </div>
                  <span style={{ fontSize: '20px' }}>
                    {expandedFaq === faq.id ? '▼' : '▶'}
                  </span>
                </button>
                {expandedFaq === faq.id && (
                  <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid #eee' }}>
                    <p style={{ margin: 0, color: '#666' }}>{faq.answer}</p>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
          <h3>📚 Документация</h3>
          <ul style={{ paddingLeft: '20px' }}>
            <li><a href="#" style={{ color: '#1976d2' }}>Руководство пользователя</a></li>
            <li><a href="#" style={{ color: '#1976d2' }}>Справка по интерфейсу</a></li>
            <li><a href="#" style={{ color: '#1976d2' }}>Видеоуроки</a></li>
            <li><a href="#" style={{ color: '#1976d2' }}>Быстрый старт</a></li>
          </ul>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
          <h3>⚙️ Техническая помощь</h3>
          <ul style={{ paddingLeft: '20px' }}>
            <li><a href="#" style={{ color: '#1976d2' }}>Решение проблем</a></li>
            <li><a href="#" style={{ color: '#1976d2' }}>Известные ошибки</a></li>
            <li><a href="#" style={{ color: '#1976d2' }}>Требования системы</a></li>
            <li><a href="#" style={{ color: '#1976d2' }}>История версий</a></li>
          </ul>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff3cd', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>💡 Полезные советы</h3>
        <ul style={{ margin: '0 0 0 20px' }}>
          <li>Используйте поиск для быстрого поиска товаров по названию, SKU или месту хранения</li>
          <li>Регулярно проверяйте отчёты о низком запасе чтобы вовремя заказать товары</li>
          <li>Используйте фильтры и сортировку для удобной работы со списками</li>
          <li>Проверяйте журнал логирования для отслеживания всех операций в системе</li>
          <li>Сохраняйте резервные копии данных регулярно</li>
        </ul>
      </div>

      <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
        <p style={{ margin: 0 }}>
          💬 <strong>Не нашли ответ?</strong> Свяжитесь с нами по одному из контактных способов выше.
        </p>
      </div>
    </div>
  );
};
