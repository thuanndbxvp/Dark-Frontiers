
import type { Expression, Style, ScriptType, NumberOfSpeakers, AiProvider, TopicSuggestionItem } from './types';

interface LabeledOption<T> {
  value: T;
  label: string;
}

export const AI_PROVIDER_OPTIONS: LabeledOption<AiProvider>[] = [
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'openai', label: 'OpenAI' },
];

export const GEMINI_MODELS: LabeledOption<string>[] = [
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (Mạnh nhất)' },
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (Nhanh)' },
    { value: 'gemini-2.5-flash-lite-latest', label: 'Gemini 2.5 Flash Lite' },
];

export const OPENAI_MODELS: LabeledOption<string>[] = [
    { value: 'gpt-5.2', label: 'GPT-5.2 (Flagship)' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
];

export const SCRIPT_TYPE_OPTIONS: LabeledOption<ScriptType>[] = [
    { value: 'Video', label: 'Video YouTube' },
    { value: 'Podcast', label: 'Podcast' },
];

export const NUMBER_OF_SPEAKERS_OPTIONS: LabeledOption<NumberOfSpeakers>[] = [
  { value: 'Auto', label: 'Tự động' },
  { value: '2', label: '2 người' },
  { value: '3', label: '3 người' },
  { value: '4', label: '4 người' },
  { value: '5', label: '5 người' },
];

export const EXPRESSION_OPTIONS: LabeledOption<Expression>[] = [
  { value: 'Ominous', label: 'U ám / Điềm báo' },
  { value: 'Gritty', label: 'Gai góc' },
  { value: 'Melancholic', label: 'U sầu' },
  { value: 'Conversational', label: 'Thân mật' },
  { value: 'Humorous', label: 'Hài hước' },
  { value: 'Authoritative', label: 'Chuyên gia' },
  { value: 'Personal', label: 'Cá nhân' },
  { value: 'Professional', label: 'Chuyên nghiệp' },
  { value: 'Persuasive', label: 'Thuyết phục' },
  { value: 'Formal', label: 'Trang trọng' },
];

export const STYLE_OPTIONS: LabeledOption<Style>[] = [
  { value: 'Cinematic Horror', label: 'Kinh dị Điện ảnh' },
  { value: 'Survival Memoir', label: 'Hồi ký Sinh tồn' },
  { value: 'Narrative', label: 'Kể chuyện' },
  { value: 'Descriptive', label: 'Miêu tả' },
  { value: 'Expository', label: 'Giải thích' },
  { value: 'Persuasive', label: 'Thuyết phục' },
  { value: 'Technical', label: 'Kỹ thuật' },
];

export const LANGUAGE_OPTIONS: { value: string, label: string }[] = [
    { value: 'Vietnamese', label: 'Tiếng Việt' },
    { value: 'English', label: 'Tiếng Anh' },
    { value: 'Korean', label: 'Tiếng Hàn' },
    { value: 'Japanese', label: 'Tiếng Nhật' },
    { value: 'Spanish', label: 'Tiếng Tây Ban Nha' },
    { value: 'Portuguese', label: 'Tiếng Bồ Đào Nha' },
];

export const DARK_FRONTIERS_IDEAS: TopicSuggestionItem[] = [
    // --- PHẦN 1: DEEP WOODS (1-8) ---
    {
        title: "1. In 1948, Hunters in the Ozarks were Stalked by the 'Gowrow'",
        outline: "Nhóm thợ săn Ozarks phát hiện những bộ xương gia súc bị lột sạch thịt và một sinh vật thằn lằn khổng lồ dài 20 feet rình rập trong hang động tối tăm ở Arkansas."
    },
    {
        title: "2. Early Puritans Swore They Were Hunted by the Pukwudgie (1690)",
        outline: "Những người định cư Massachusetts biến mất không dấu vết, chỉ để lại những mũi tên nhỏ tẩm độc và cảm giác bị theo dõi bởi yêu tinh ma thuật từ rừng sâu."
    },
    {
        title: "3. In 1891, Lumberjacks in Wisconsin Encountered the Hodag",
        outline: "Thợ rừng Wisconsin đối mặt với sinh vật có sừng trâu, lưng đầy gai nhọn và nụ cười dị hợm luôn thách thức mọi loại đạn dược trong sương mù."
    },
    {
        title: "4. In 1932, a CCC Work Crew Was Attacked by the Snallygaster",
        outline: "Công nhân làm đường thời Đại Suy Thoái bị một thực thể lai giữa rồng và chim lao xuống từ bầu trời Maryland, bắt đi từng người trong tiếng gào thét."
    },
    {
        title: "5. Early Appalachian Settlers Claimed They Saw the Raven Mocker (1810)",
        outline: "Cái chết bí ẩn của những người già trong làng Appalachia. Bác sĩ địa phương nghe thấy tiếng quạ kêu như tiếng người cười khanh khách và nỗi sợ mất tim."
    },
    {
        title: "6. In 1952, West Virginia Locals Encountered the Flatwoods Monster",
        outline: "Nhóm dân phòng điều tra vật thể rơi phát hiện sinh vật cao 3 mét tỏa khí độc, đôi mắt phát sáng làm tê liệt mọi dây thần kinh của kẻ đối diện."
    },
    {
        title: "7. In 1870, Trappers in Maine Were Stalked by the Specter Moose",
        outline: "Con nai ma khổng lồ màu trắng bất tử giữa rừng tuyết Maine. Đạn xuyên qua người nó không để lại dấu vết, nó lùa thợ săn đến bờ vực của sự điên loạn."
    },
    {
        title: "8. The Night 19th Century Loggers Met the Hidebehind",
        outline: "Quái vật không bao giờ lộ diện, luôn đứng sau lưng nạn nhân. Một nhóm thợ rừng nhận ra đồng đội biến mất không tiếng động mỗi khi họ quay đầu lại."
    },

    // --- PHẦN 2: DESERT & MINES (9-15) ---
    {
        title: "9. In 1850, California Gold Miners Awakened the Tommyknockers",
        outline: "Tiếng gõ nhịp nhàng dưới hầm mỏ California không phải báo hiệu vàng, mà là điềm báo dầm sập và những yêu tinh hầm mỏ đang bò ra từ kẽ đá."
    },
    {
        title: "10. In 1903, Visitors to Van Meter Swore They Saw the Winged Visitor",
        outline: "Cả thị trấn Iowa xách súng săn lùng quái vật có cánh bắn tia sáng từ trán. Nó miễn nhiễm đạn dược và dẫn dụ họ vào một mỏ than bỏ hoang."
    },
    {
        title: "11. Early Cowboys in Texas Claimed They Fought the Chupacabra (1890)",
        outline: "Phiên bản Chupacabra nguyên thủy: đi bằng hai chân, gai góc, nhảy cao như Kanguru và tàn sát đàn bò tót trong một đêm không trăng."
    },
    {
        title: "12. In 1947, Roswell Ranchers Found Something That Wasn't Human",
        outline: "Góc nhìn kinh dị sinh tồn: Một đêm kinh hoàng trong nhà kho khi chủ trang trại Roswell phải đối mặt với một thực thể bị thương đang giao tiếp bằng sóng não đau đớn."
    },
    {
        title: "13. In 1880, Arizona Rangers Were Hunted by the Mogollon Monster",
        outline: "Bigfoot sa mạc hung hãn, biết ném đá và bắt chước tiếng trẻ con khóc để dụ các kỵ binh Arizona vào những hẻm núi cụt không lối thoát."
    },
    {
        title: "14. In 1930, Route 66 Travelers Encountered 'The Dark Watchers'",
        outline: "Những bóng đen khổng lồ đứng yên trên đỉnh núi Santa Lucia. Chúng không tấn công, nhưng mỗi khi bạn quay đi, chúng lại di chuyển gần hơn một chút."
    },
    {
        title: "15. In 1865, Confederate Soldiers Hid in a Cave of the 'Cave Apes'",
        outline: "Lính đào tẩu ẩn náu trong hang động Mammoth sâu thẳm, nhận ra họ đang chia sẻ không gian với những sinh vật hoang dã chưa từng thấy ánh mặt trời."
    },

    // --- PHẦN 3: WATERS & SWAMPS (16-22) ---
    {
        title: "16. In 1864, Union Sailors Were Attacked by the Chesapeake Bay Monster",
        outline: "Thủy thủ tàu chiến hạm Ironclad phát hiện nhịp tim của một con Leviathan khổng lồ dưới đáy vịnh, thứ mà họ tưởng lầm là tàu ngầm của đối phương."
    },
    {
        title: "17. Early Fur Traders Swore They Saw the Mishipeshu (1790)",
        outline: "Hồ Superior lạnh lẽo không bao giờ trả lại xác người chết. Những người buôn lông thú đối mặt với Báo Nước có sừng đang rình rập dưới làn nước đóng băng."
    },
    {
        title: "18. In 1955, Ohio Police Were Attacked by the Loveland Frogmen",
        outline: "Cảnh sát tuần tra đêm gặp những sinh vật đứng thẳng như người, có đầu ếch và cầm những vật phát ra tia lửa điện chết người bên vệ đường Ohio."
    },
    {
        title: "19. In 1920, Florida Smugglers Encountered the Skunk Ape",
        outline: "Mùi hôi thối nồng nặc báo hiệu sự xuất hiện của quái vật đầm lầy Everglades. Nó xé toạc thuyền buôn lậu để tìm kiếm thức ăn và máu."
    },
    {
        title: "20. Colonial Settlers in Georgia Claimed They Saw the Altamaha-ha",
        outline: "Những ruộng lúa ven sông bị tàn phá bởi một con rắn có đầu cá sấu khổng lồ. Nô lệ kể về thứ quái vật bơi ngược dòng vào ban đêm."
    },
    {
        title: "21. In 1942, Navy Divers Encountered the 'Singing Ghosts' of Pearl Harbor",
        outline: "Thợ lặn cứu hộ nghe thấy tiếng hát u hồn dưới xác tàu đắm và nhìn thấy những bóng hình không cần bình dưỡng khí đang lướt đi trong bóng tối đại dương."
    },
    {
        title: "22. In 1817, Gloucester Fishermen Fought the Great Sea Serpent",
        outline: "Hàng trăm nhân chứng chứng kiến con rắn biển dài 100 feet tiến vào cảng. Đạn pháo từ pháo đài nảy ra khỏi lớp da vảy cứng như sắt của nó."
    },

    // --- PHẦN 4: URBAN LEGENDS & CURSES (23-30) ---
    {
        title: "23. In 1930, Tennessee Farmers Were Tormented by the Bell Witch",
        outline: "Thực thể tâm linh tàn bạo nhất lịch sử Mỹ không chỉ gây ra tiếng động; nó cấu véo, tấn công vật lý và thì thầm những bí mật đen tối của gia đình Bell."
    },
    {
        title: "24. In 1888, Doctors at an Ohio Asylum Encountered the 'Melon Heads'",
        outline: "Những đứa trẻ đầu to đột biến trốn thoát khỏi viện tâm thần và bắt đầu cuộc đi săn ngược lại những bác sĩ đã thực hiện thí nghiệm lên chúng."
    },
    {
        title: "25. In 1959, Hikers in Dyatlov Pass (USA Version) Encountered 'Walking Sam'",
        outline: "Thực thể cao 5 mét với đôi tay lêu nghêu, thôi miên các thanh thiếu niên vào sự tuyệt vọng và dẫn dụ họ đến những hành vi tự kết liễu đời mình."
    },
    {
        title: "26. In 1944, Soldiers in Hawaii marched with the Night Marchers",
        outline: "Tiếng trống và tù và vang dội trong rừng đêm Hawaii. Nếu bạn nhìn vào mắt đội quân ma này, linh hồn bạn sẽ bị bắt đi vĩnh viễn."
    },
    {
        title: "27. In 1910, Residents of New Orleans Were Stalked by 'The Axeman'",
        outline: "Kẻ sát nhân tự xưng là quỷ dữ yêu cầu mọi nhà phải chơi nhạc Jazz nếu không muốn bị xẻ thịt. Cảnh sát phục kích và phát hiện hắn không phải con người."
    },
    {
        title: "28. In 1855, Cowboys Encountered the 'Deer Woman' in a Saloon",
        outline: "Mỹ nhân tuyệt sắc xuất hiện trong quán rượu, nhưng bên dưới váy là đôi chân hươu. Những kẻ bám theo cô vào rừng đều bị đạp nát ngực."
    },
    {
        title: "29. In 1934, Children in Kentucky claimed to play with 'The Goblins'",
        outline: "Gia đình nông dân bắn hàng trăm viên đạn vào những sinh vật bạc nhỏ bé lơ lửng quanh nhà. Tiếng đạn va chạm như đập vào kim loại nhưng chúng không chết."
    },
    {
        title: "30. In 1892, Vampires Stalked the Town of Exeter, Rhode Island",
        outline: "Gia đình Mercy Brown phải đào mộ người thân để đốt tim, tin rằng người chết đang quay lại hút cạn sinh lực của người sống từ dưới mồ."
    },

    // --- PHẦN 5: INTERNATIONAL & DEEP SEA (31-45) ---
    {
        title: "31. Early Portuguese Sailors Swore They Encountered a Sea Bishop",
        outline: "Giữa Đại Tây Dương, các thủy thủ Bồ Đào Nha đối mặt với một sinh vật có hình dáng giống giám mục nhưng làn da đầy vảy cá và đôi mắt lạnh lẽo của vực thẳm."
    },
    {
        title: "32. In 1940, U-Boat Crews Were Attacked by a Kraken",
        outline: "Tàu ngầm Đức trong Thế chiến II bị những xúc tu khổng lồ quấn chặt. Radar sonar ghi lại nhịp tim của một quái vật lớn hơn cả con tàu."
    },
    {
        title: "33. In 1892, Riverboat Captains Encountered the Altamaha-ha",
        outline: "Đội trưởng tàu sông chứng kiến sinh vật dài 30 feet, đầu cá sấu thân rắn tấn công các sà lan chở gỗ trong sương mù dày đặc."
    },
    {
        title: "34. The Night Pearl Divers Were Hunted by the Lusca in the Bahamas",
        outline: "Thợ lặn ngọc trai đối mặt với quái vật nửa cá mập nửa bạch tuộc ẩn nấp trong các hang xanh sâu thẳm của vùng biển Bahamas."
    },
    {
        title: "35. Early Viking Explorers Claimed They Fought the Hafgufa",
        outline: "Các chiến binh Viking mô tả một quái vật biển khổng lồ giống như hòn đảo đang há miệng chờ đợi để nuốt chửng cả đoàn thuyền chiến."
    },
    {
        title: "36. In 1910, Lighthouse Keepers Vanished from Eilean Mor",
        outline: "Ba người gác hải đăng biến mất khỏi một hòn đảo hẻo lánh. Bữa ăn vẫn còn trên bàn, nhưng không khí tràn ngập nỗi sợ hãi về một thứ gì đó từ đại dương."
    },
    {
        title: "37. Fishermen Swore They Were Stalked by the Ningen in Antarctica",
        outline: "Các tàu cá Nam Cực phát hiện sinh vật trắng muốt khổng lồ có hình dáng giống người nhưng không có khuôn mặt, đang bơi song song với tàu."
    },
    {
        title: "38. In 1845, Franklin Expedition Members Encountered the Tuunbaq",
        outline: "Đoàn thám hiểm bị kẹt trong băng Bắc Cực bị săn lùng bởi một quái vật gấu khổng lồ có trí tuệ con người và khát khao ăn linh hồn."
    },
    {
        title: "39. Early Siberian Hunters Swore They Were Stalked by the Chuchunaa",
        outline: "Thợ săn Siberia đối mặt với 'người tuyết' hung hãn mang bộ lông đen kịt, có khả năng tàng hình giữa những cơn bão tuyết mù mịt."
    },
    {
        title: "40. The Night Soviet Hikers Were Attacked in the Dyatlov Pass",
        outline: "Hồ sơ mật về sự kiện đèo Dyatlov: Những thi thể bị chấn thương nội tạng khủng khiếp mà không có vết thương bên ngoài, và cảm giác về một thực thể vô hình."
    },
    {
        title: "41. In 1908, Tunguska Researchers Found Signs of Alien Life",
        outline: "Vụ nổ Tunguska không phải thiên thạch. Các nhà nghiên cứu phát hiện những mảnh vỡ kim loại không xác định và những sinh vật không thuộc về Trái Đất."
    },
    {
        title: "42. Early Mountaineers Claimed They Saw the Big Gray Man of Ben Macdhui",
        outline: "Những nhà leo núi Scotland nghe thấy tiếng bước chân khổng lồ sau lưng trong sương mù và cảm nhận nỗi sợ hãi nguyên thủy phát ra từ gã khổng lồ màu xám."
    },
    {
        title: "43. In 1898, Klondike Miners Were Hunted by the Mahaha",
        outline: "Yêu tinh băng giá với đôi tay có móng vuốt dài, tấn công thợ mỏ bằng cách thọc lét nạn nhân cho đến khi họ chết trong tiếng cười kinh hoàng."
    },
    {
        title: "44. Railroad Workers Swore They Encountered the Qalupalik",
        outline: "Công nhân đường sắt phương Bắc phát hiện sinh vật giống người có làn da xanh mướt rình rập quanh các trại, tìm cách bắt cóc những ai đi lẻ trong đêm."
    },
    {
        title: "45. In 1935, CCC Workers Were Stalked by the Hidebehind",
        outline: "Lại là Hidebehind, lần này tấn công các công nhân bảo tồn rừng. Sự biến mất âm thầm của các lính canh đêm khiến cả trại rơi vào hoảng loạn."
    },

    // --- PHẦN 6: JUNGLE & DESERT HORROR (46-60) ---
    {
        title: "46. Early French Trappers Encountered the Loup-Garou",
        outline: "Người sói trong văn hóa Pháp-Canada rình rập các trại thợ săn. Đạn chì vô dụng, chỉ có niềm tin và bạc mới có thể đẩy lùi nó."
    },
    {
        title: "47. The Night Vietnam War Soldiers Encountered the Rock Apes",
        outline: "Những binh lính trong rừng rậm Việt Nam đối mặt với bầy khỉ khổng lồ hung hãn, biết dùng đá làm vũ khí và phát ra những tiếng gào thét rợn người."
    },
    {
        title: "48. In 1880, Loggers Swore They Were Attacked by the Hodag",
        outline: "Hành trình thợ rừng Wisconsin cố gắng bẫy con Hodag hung tợn, dẫn đến cuộc tàn sát đẫm máu trong xưởng cưa bỏ hoang."
    },
    {
        title: "49. Amazon Rubber Tappers Claimed They Saw the Mapinguari",
        outline: "Sâu trong rừng Amazon, những người khai thác cao su đối mặt với quái vật một mắt khổng lồ có miệng ở bụng và mùi hôi thối làm tê liệt con mồi."
    },
    {
        title: "50. In 1924, Miners Were Attacked by Bigfoot at Ape Canyon",
        outline: "Nhóm thợ mỏ bị bầy Bigfoot bao vây và tấn công bằng đá suốt một đêm dài trong cabin gỗ cô lập trên núi St. Helens."
    },
    {
        title: "51. Colonial Settlers Swore They Were Hunted by the Dover Demon",
        outline: "Sinh vật kỳ quái với làn da nhợt nhạt và đôi mắt cam rực sáng xuất hiện quanh các khu định cư, gieo rắc điềm báo về cái chết và bệnh tật."
    },
    {
        title: "52. In 1870, Cowboys Were Stalked by the Night Stalker of Nevada",
        outline: "Giữa hoang mạc Nevada, một thực thể bóng tối rình rập quanh các đống lửa trại của những cao bồi, bắt đi ngựa và người mà không để lại dấu vết."
    },
    {
        title: "53. Early Archaeologists Encountered the Death Anubis in Egypt",
        outline: "Các nhà khảo cổ khai quật lăng mộ cổ phát hiện thần Anubis không phải tượng đá mà là một thực thể sống canh giữ giấc ngủ của các Pharaoh."
    },
    {
        title: "54. The Night Route 66 Travelers Were Attacked by the Skinwalker",
        outline: "Những người lái xe trên cung đường 66 chứng kiến một con chó sói biến hình thành người và đuổi theo xe với vận tốc 100km/h trong ánh trăng."
    },
    {
        title: "55. In 1955, Farmers Encountered the Hopkinsville Goblins",
        outline: "Gia đình nông dân Kentucky trải qua đêm kinh hoàng khi những sinh vật nhỏ màu bạc liên tục tấn công từ cửa sổ và mái nhà."
    },
    {
        title: "56. Oil Drillers Swore They Broke Into Hell in Siberia",
        outline: "Mũi khoan sâu 14km tại Siberia bắt được những âm thanh la hét của hàng triệu linh hồn đang bị tra tấn từ lòng đất."
    },
    {
        title: "57. In 1850, Rangers Discovered a Canyon of the J'ba Fofi",
        outline: "Các lính kiểm lâm lạc vào hẻm núi của loài nhện khổng lồ có kích thước bằng con bò, giăng lưới kín cả một vùng thung lũng."
    },
    {
        title: "58. Spelunkers Claimed They Were Hunted by the Rake in 1960",
        outline: "Nhóm thám hiểm hang động đối mặt với sinh vật gầy gò nhợt nhạt có móng vuốt dài, rình rập họ trong bóng tối vĩnh cửu của lòng đất."
    },
    {
        title: "59. The Night Civil War Soldiers Encountered a Ghost Regiment",
        outline: "Giữa chiến trường Gettysburg, hai nhóm lính đối đầu nhận ra họ đang bị bao vây bởi một trung đoàn ma từ quá khứ đang tiếp tục cuộc chiến vô tận."
    },
    {
        title: "60. In 1899, Texas Rangers Were Attacked by the Chupacabra",
        outline: "Đội cảnh sát Texas Rangers truy đuổi một băng cướp và phát hiện tất cả đã bị hút cạn máu bởi một thực thể gai góc chưa từng có trong hồ sơ tội phạm."
    }
];
