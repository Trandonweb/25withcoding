class Shape:
    def __init__(self, ID, size):
        self.ID = ID
        self.size = size

    def area(self):
        return self.size


class Circle(Shape):
    def __init__(self, ID, r):
        self.r = r
        self.type = '원'
        super().__init__(ID, (r ** 2) * 3.14)

    def printing(self):
        print(f'{self.ID} {self.type} {self.size}')


class Rectangle(Shape):
    def __init__(self, ID, h, w):
        self.h = h
        self.w = w
        self.type = '사각형'
        super().__init__(ID, h * w)

    def printing(self):
        print(f'{self.ID} {self.type} {self.size}')



class Triangle(Shape):
    def __init__(self, ID, h, w):
        self.h = h
        self.w = w
        self.type = '삼각형'
        super().__init__(ID, h * w / 2)

    def printing(self):
        print(f'{self.ID} {self.type} {self.size}')


class ShapeList:
    def __init__(self, shapelist):
        self.shapelist = shapelist

    def ID_CHECK(self, shape_list):
        for i in self.shapelist:
            if i.ID == shape_list[0]:
                return False
        return True

    def sumarea(self):
        a_area = 0
        for i in self.shapelist:
            a_area += i.size
        print(a_area)

    def Add(self, shape):
        self.shapelist.append(shape)
        self.sumarea()

    def pop(self, shape_ID):
        num = 0
        for i in self.shapelist:

            if shape_ID == i.ID:
                self.shapelist.pop(num)
                print('삭제완료!')
                self.sumarea()
                break
            num += 1

    def shape_lists(self,idx):
        return self.shapelist[idx]

    def len_shape_lists(self):
        return len(self.shapelist)

shapelist = ShapeList([])

while True:
    menu = int(input('\n작업 선택 : 1. 도형 입력, 2. 도형 삭제, 3. 도형 목록, 4. 도형 통계, 5. 종료, 6. 파일 읽기, 7. 파일 저장 : '))
    if menu == 1:
        shape_type = int(input('\n도형 종류 선택 : 1. 삼각형, 2. 사각형, 3. 원 : '))

        if shape_type == 1:
            shape_inform = input('\n삼각형 : ID, 너비, 높이 입력 : ')

            shape_list = shape_inform.split(',')
            ID_check = shapelist.ID_CHECK(shape_list)
            if ID_check:
                shapelist.Add(Triangle(shape_list[0], int(shape_list[1]), int(shape_list[2])))


            else:
                print('ERROR!!')




        elif shape_type == 2:
            shape_inform = input('\n사각형 : ID, 너비, 높이 입력 : ')
            shape_list = shape_inform.split(',')
            ID_check = shapelist.ID_CHECK(shape_list)
            if ID_check:
                shapelist.Add(Rectangle(shape_list[0], int(shape_list[1]), int(shape_list[2])))


            else:
                print('ERROR!!')

        elif shape_type == 3:
            shape_inform = input('\n원 : ID, 반지름 입력 : ')
            shape_list = shape_inform.split(',')
            ID_check = shapelist.ID_CHECK(shape_list)
            if ID_check:
                shapelist.Add(Circle(shape_list[0], int(shape_list[1])))


            else:
                print('ERROR!!')

    elif menu == 2:
        shape_ID = input('\n도형 ID : ')
        shapelist.pop(shape_ID)


    elif menu == 3:
        for shape in shapelist.shapelist:
            shape.printing()

    elif menu == 4:
        c_area = 0
        r_area = 0
        t_area = 0
        c_count = 0
        r_count = 0
        t_count = 0

        for shape in shapelist.shapelist:
            if isinstance(shape, Rectangle):
                r_count += 1
                r_area += shape.size

            elif isinstance(shape, Circle):
                c_count += 1
                c_area += shape.size

            elif isinstance(shape, Triangle):
                t_count += 1
                t_area += shape.size

        print('사각형 %d개 넓이 %f\n삼각형 %d개 넓이 %f\n원\t %d개 넓이 %f' % (r_count, r_area, t_count, t_area, c_count, c_area))

    elif menu == 5:
        break


    elif menu == 6:
        filename = input('읽을 파일의 이름을 입력하세요. : ')
        f = open(filename, 'r', encoding='utf-8')
        lines = f.readlines()
        f.close()
        shape_tmp = []
        for i in range(len(lines)):
            shape_tmp.append(lines[i].split(', '))

        for i in range(len(shape_tmp)):
            if shape_tmp[i][0] == '원':
                shapelist.Add(Circle(shape_tmp[i][1], int(shape_tmp[i][2])))

            elif shape_tmp[i][0] == '사각형' :
                shapelist.Add(Rectangle(shape_tmp[i][1], int(shape_tmp[i][2]), int(shape_tmp[i][3])))

            elif shape_tmp[i][0] == '삼각형' :
                shapelist.Add(Rectangle(shape_tmp[i][1], int(shape_tmp[i][2]), int(shape_tmp[i][3])))

        print('등록 완료')

    elif menu == 7:
        filename = input('저장할 파일의 이름을 입력하세요. : ')
        f = open(filename, 'w', encoding='utf-8')

        for i in range(shapelist.len_shape_lists()):
            shape_list_tmp = shapelist.shape_lists(i)
            if shape_list_tmp.type == '원':
                f.write(f'{shape_list_tmp.type}, {shape_list_tmp.ID}, {shape_list_tmp.r}\n')

            else :
                f.write(f'{shape_list_tmp.type}, {shape_list_tmp.ID}, {shape_list_tmp.h}, {shape_list_tmp.w}\n')

        f.close()
        print('%d개 저장 완료' % len(shapelist.shapelist))
