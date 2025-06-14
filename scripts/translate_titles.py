#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import os

# 定义翻译映射
translations = {
    'Làm quen hỏi tên, tuổi, quê': '初识问姓名年龄家乡',
    'Hỏi thăm công việc': '询问工作',
    'Hỏi tình hình gia đình, hôn nhân, chuyện tình cảm': '询问家庭婚姻感情',
    'Thời tiết nóng, mood hnay': '炎热天气今日心情',
    'Giải trí: phim hay, nhạc khoái nghe, địa điểm du lịch mơ ước': '娱乐电影音乐旅游',
    'Thói quen: giờ giấc sinh hoạt, tập gym/chơi thể thao gì, ăn uống kiểu nào, giờ làm/giờ nghỉ': '生活习惯作息运动饮食',
    'Chọc cười, sẻ chia cảm xúc với đối phương': '逗笑分享情感',
    'Giới thiệu ngắn gọn về bản thân, Khoe chút bí mật nho nhỏ': '自我介绍小秘密',
    'Hỏi han về công việc, cuộc sống của người ta. Tạo cảm giác tin tưởng, an tâm': '关心工作生活建立信任',
    'Học vấn: trường đại học, chuyên ngành Công việc: ngành nghề, vị trí, nhiệm vụ hằng ngày': '学历教育工作职位',
    'Gia đình: ba mẹ, anh chị em, không khí nhà cửa': '家庭父母兄弟姐妹',
    'Bạn bè: mối quan hệ, tụ tập, hoạt động xã hội': '朋友关系社交活动',
    'Thái độ với sự nghiệp, tiền bạc, sức khỏe': '对事业金钱健康态度',
    'Cách giải quyết vấn đề: gặp khó thì xử lý ra sao': '解决问题方式',
    'Thu nhập: lương, kinh doanh, đầu tư': '收入工资投资',
    'Tài sản cơ bản: nhà cửa, xe cộ, tiết kiệm/đầu tư như thế nào': '基本资产房车储蓄',
    'Mục tiêu: ngắn/trung/dài hạn trong công việc – cuộc sống': '短中长期目标',
    'Điều muốn thử: lĩnh vực mới, trải nghiệm mới': '想尝试新领域',
    'Mong đợi về yêu đương/hôn nhân cách giao tiếp, ăn ở sao cho hoà hợp': '恋爱婚姻期望',
    'Dự định về gia đình/con cái: khi nào cưới, quan điểm nuôi dạy trẻ': '家庭子女计划',
    'Chia sẻ một cơ hội nhỏ, lợi nhuận thì không nhỏ': '分享投资机会',
    'Mập mờ': '暧昧',
    'Tán tỉnh': '调情',
    'Cơ thể': '身体',
    'Cung hoàng đạo': '星座',
    'Ẩm thực': '美食',
    'Du lịch': '旅游',
    'Phim ảnh': '电影',
    'Trải nghiệm tình cảm': '感情经历'
}

def translate_csv():
    input_file = '话题库1.csv'
    
    # 读取原文件
    with open(input_file, 'r', encoding='utf-8') as file:
        content = file.read()

    # 逐行处理
    lines = content.split('\n')
    new_lines = []

    for line in lines:
        if line.strip():
            # 处理每行数据
            for vi_text, cn_text in translations.items():
                if f'"{vi_text}"' in line or f',{vi_text},' in line:
                    # 查找第一个逗号之前的内容（第一列）
                    parts = line.split(',', 1)
                    if len(parts) >= 2:
                        first_col = parts[0].strip()
                        rest = parts[1]
                        
                        # 如果第一列为空或者不是正确的中文翻译，更新它
                        if not first_col or first_col != cn_text:
                            line = cn_text + ',' + rest
                    break
            
            new_lines.append(line)
        else:
            new_lines.append(line)

    # 写回文件
    with open(input_file, 'w', encoding='utf-8') as file:
        file.write('\n'.join(new_lines))

    print('翻译完成！')

if __name__ == '__main__':
    translate_csv() 