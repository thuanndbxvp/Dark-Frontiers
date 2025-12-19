import type { Expression, Style } from '../types';

export const EXPRESSION_EXPLANATIONS: Record<Expression, string> = {
  'Conversational': 'Sử dụng lối nói chuyện thân mật, tự nhiên như đang trò chuyện với bạn bè, giảm khoảng cách với người xem.',
  'Humorous': 'Lồng ghép các yếu tố hài hước, dí dỏm để tạo sự giải trí và giúp nội dung dễ nhớ hơn.',
  'Authoritative': 'Thể hiện sự tự tin, chắc chắn và am hiểu sâu sắc về chủ đề, tạo cảm giác của một chuyên gia.',
  'Personal': 'Chia sẻ quan điểm, kinh nghiệm và cảm xúc cá nhân, tạo sự chân thật và gần gũi.',
  'Empathetic': 'Thể hiện sự đồng cảm, thấu hiểu với cảm xúc và tình huống của khán giả, tạo sự kết nối sâu sắc.',
  'Professional': 'Diễn đạt một cách chuyên nghiệp, lịch sự, rõ ràng, phù hợp với môi trường công sở, doanh nghiệp.',
  'Persuasive': 'Dùng lập luận, dẫn chứng và lối diễn đạt mạnh mẽ, quả quyết để thuyết phục người xem đồng ý với một quan điểm hoặc thực hiện một hành động.',
  'Formal': 'Sử dụng ngôn ngữ trang trọng, học thuật, phù hợp với các chủ đề nghiêm túc, phân tích sâu.',
  'Informative': 'Tập trung vào việc cung cấp thông tin một cách rõ ràng, trực tiếp, khách quan và dựa trên dữ liệu.',
  'Inspirational': 'Truyền tải thông điệp tích cực, tạo động lực và truyền cảm hứng cho người xem.',
  // Fix: Added missing explanations for Ominous, Gritty, and Melancholic expressions
  'Ominous': 'Tạo không khí đầy điềm báo, u tối và căng thẳng, gợi cảm giác về những điều tồi tệ sắp xảy ra.',
  'Gritty': 'Diễn đạt một cách chân thực, gai góc, không né tránh những khía cạnh khốc liệt hay thô ráp.',
  'Melancholic': 'Mang âm hưởng buồn bã, u sầu và hoài niệm, tạo sự lắng đọng trong cảm xúc.',
};


export const STYLE_EXPLANATIONS: Record<Style, string> = {
  'Narrative': 'Kể lại một câu chuyện có đầu có cuối, với nhân vật, bối cảnh và diễn biến sự việc.',
  'Descriptive': 'Sử dụng ngôn từ giàu hình ảnh để miêu tả chi tiết một đối tượng, sự vật hoặc khung cảnh.',
  'Expository': 'Giải thích một khái niệm, quy trình hoặc vấn đề một cách logic, có hệ thống và dễ hiểu.',
  'Persuasive': 'Xây dựng kịch bản với mục đích chính là thuyết phục, kêu gọi hành động từ phía khán giả.',
  'Technical': 'Tập trung vào các thuật ngữ, thông số kỹ thuật, phù hợp với các video review, hướng dẫn chuyên sâu.',
  'Academic': 'Trình bày nội dung theo phong cách học thuật, có trích dẫn, luận điểm rõ ràng, phù hợp với kênh giáo dục.',
  'Business': 'Sử dụng ngôn ngữ chuyên nghiệp, tập trung vào các vấn đề kinh doanh, marketing, tài chính.',
  // Fix: Added missing explanations for Cinematic Horror and Survival Memoir styles
  'Cinematic Horror': 'Phong cách kể chuyện kinh dị mang tính điện ảnh, tập trung vào nhịp điệu và không gian rùng rợn.',
  'Survival Memoir': 'Lối viết theo dạng hồi ký sinh tồn, tập trung vào những trải nghiệm thực tế và cảm xúc của người trong cuộc.',
};

export const FORMATTING_EXPLANATIONS = {
  wordCount: 'Xác định độ dài ước tính cho kịch bản. Với video dài (>1000 từ), AI sẽ tạo dàn ý chi tiết trước để đảm bảo chất lượng và sự logic.',
  videoDuration: 'Nhập thời lượng video mong muốn (tính bằng phút). AI sẽ tự động ước tính số từ cần thiết (khoảng 150 từ/phút) để tạo kịch bản có độ dài phù hợp.',
  scriptParts: 'Chia kịch bản thành số phần chính mong muốn. Chọn "Tự động" để AI quyết định cấu trúc tốt nhất dựa trên chủ đề.',
  includeIntro: 'Tự động tạo một đoạn mở đầu hấp dẫn để thu hút và giữ chân người xem ngay từ những giây đầu tiên.',
  includeOutro: 'Tự động tạo một đoạn kết luận, tóm tắt nội dung và bao gồm lời kêu gọi hành động (call-to-action).',
  headings: 'Sử dụng các tiêu đề (ví dụ: ## Phần 1) để phân chia rõ ràng các phần chính trong kịch bản.',
  bullets: 'Dùng gạch đầu dòng hoặc danh sách có số thứ tự để trình bày thông tin một cách cô đọng, dễ theo dõi.',
  bold: 'Làm nổi bật các từ khóa hoặc điểm chính bằng cách in đậm/in nghiêng chúng trong văn bản.',
};