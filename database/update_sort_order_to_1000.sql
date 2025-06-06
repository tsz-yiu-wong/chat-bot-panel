-- 更新现有话题库数据的排序值从1000开始
-- 这样可以方便在现有项目前面插入新的项目

-- 更新大类的排序值
-- 将所有小于1000的sort_order值增加1000
UPDATE topic_categories 
SET sort_order = CASE 
    WHEN sort_order < 1000 THEN sort_order + 1000 
    ELSE sort_order 
END
WHERE sort_order < 1000;

-- 更新小类的排序值  
-- 将所有小于1000的sort_order值增加1000
UPDATE topic_subcategories 
SET sort_order = CASE 
    WHEN sort_order < 1000 THEN sort_order + 1000 
    ELSE sort_order 
END
WHERE sort_order < 1000;

-- 更新话题的排序值
-- 将所有小于1000的sort_order值增加1000
UPDATE topics 
SET sort_order = CASE 
    WHEN sort_order < 1000 THEN sort_order + 1000 
    ELSE sort_order 
END
WHERE sort_order < 1000;

-- 验证更新结果
SELECT 'topic_categories' as table_name, 
       COUNT(*) as total_count, 
       MIN(sort_order) as min_sort_order, 
       MAX(sort_order) as max_sort_order
FROM topic_categories
UNION ALL
SELECT 'topic_subcategories' as table_name, 
       COUNT(*) as total_count, 
       MIN(sort_order) as min_sort_order, 
       MAX(sort_order) as max_sort_order
FROM topic_subcategories
UNION ALL
SELECT 'topics' as table_name, 
       COUNT(*) as total_count, 
       MIN(sort_order) as min_sort_order, 
       MAX(sort_order) as max_sort_order
FROM topics
ORDER BY table_name; 